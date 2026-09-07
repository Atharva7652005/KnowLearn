"""AI processing pipeline for transcripts and learning material generation."""

from __future__ import annotations

from os import getenv
from urllib.parse import parse_qs, urlparse

from langchain_core.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import TranscriptsDisabled, YouTubeTranscriptApi

OPENAI_MODEL = getenv("OPENAI_MODEL", "openai/gpt-4o-mini")
# latest model: gpt-5.6-luna

class ProcessingError(RuntimeError):
    """Raised when an AI operation fails."""


def _response_text(response) -> str:
    """Extract text from various Langchain response objects safely."""
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    content = getattr(response, "content", response)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content)


def get_video_id(url: str) -> str | None:
    """Extract a video identifier from common YouTube URL forms."""

    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    if hostname in {"www.youtube.com", "youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        if parsed.path.startswith(("/shorts/", "/embed/")):
            parts = parsed.path.strip("/").split("/")
            return parts[1] if len(parts) > 1 else None

    if hostname == "youtu.be":
        return parsed.path.strip("/") or None

    return None


def fetch_youtube_transcript(url: str) -> tuple[str, str]:
    video_id = get_video_id(url)
    if not video_id:
        raise ProcessingError("Provide a valid YouTube watch, short, embed, or youtu.be URL.")
    try:
        transcript_list = YouTubeTranscriptApi().list(video_id)
        transcript_item = None
        for t in transcript_list:
            transcript_item = t
            if not t.is_generated:
                break
        if not transcript_item:
            raise ProcessingError("No transcripts found for this video.")
            
        items = transcript_item.fetch()
        language_code = transcript_item.language_code
    except TranscriptsDisabled as exc:
        raise ProcessingError("Captions are disabled for this YouTube video.") from exc
    except Exception as exc:
        raise ProcessingError(f"Unable to retrieve the YouTube transcript: {exc}") from exc
    transcript = " ".join(item.text for item in items if item.text.strip())
    if not transcript:
        raise ProcessingError("The YouTube video did not return any readable transcript text.")
    return transcript, language_code


def answer_from_transcript(transcript: str, question: str, previous_feedback: list[str] | None = None, content_id: str | None = None, model_name: str = "openai/gpt-4o-mini") -> tuple[str, list[str]]:
    """Query Pinecone index and produce an answer grounded only in the transcript."""
    import os

    gemini_api_key = getenv("GEMINI_API_KEY")
    openai_api_key = getenv("OPENAI_API_KEY")
    openai_base_url = getenv("OPENAI_BASE_URL")

    if not gemini_api_key:
        raise ProcessingError("GEMINI_API_KEY is not configured on the server.")
    if not openai_api_key:
        raise ProcessingError("OPENAI_API_KEY is not configured on the server.")

    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001", google_api_key=gemini_api_key)
        
        index_name = "graspify-db"
        pc = Pinecone(api_key=getenv("PINECONE_API_KEY"))
        index = pc.Index(index_name)
        
        namespace = content_id if content_id else "default"
        stats = index.describe_index_stats()
        namespaces = stats.get("namespaces", {})
        
        vector_store = PineconeVectorStore(index=index, embedding=embeddings, namespace=namespace)
        
        if namespace not in namespaces:
            separators = ["\n\n", "\n", "。", "！", "？", "，", " ", ""]
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, separators=separators)
            chunks = splitter.create_documents([transcript])
            vector_store.add_documents(chunks)

        documents = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 4}).invoke(question)
        context = "\n\n".join(document.page_content for document in documents)

        feedback_instructions = ""
        if previous_feedback:
            feedback_instructions = "\n\nThe user previously left negative feedback on these responses. Do NOT repeat these mistakes:\n" + "\n---\n".join(previous_feedback)

        prompt = PromptTemplate(
            template=("You are a helpful educational assistant. Answer ONLY from the transcript context. "
                      "If the context is insufficient, say you do not know.\n\n"
                      "{context}\n\nQuestion: {question}" + feedback_instructions),
            input_variables=["context", "question"],
        )

        llm = _get_llm(model_name)

        response = llm.invoke(
            prompt.invoke(
                {
                    "context": context, 
                    "question": question
                }
            )
        )

    except Exception as exc:
        raise ProcessingError(f"Unable to create an AI response: {exc}") from exc

    return _response_text(response), [document.page_content for document in documents]


def _get_llm(model_name: str = "openai/gpt-4o-mini") -> ChatOpenAI:
    api_key = getenv("OPENAI_API_KEY")
    if not api_key:
        raise ProcessingError("OPENAI_API_KEY is not configured on the server.")
    base_url = getenv("OPENAI_BASE_URL")
    return ChatOpenAI(model=model_name, api_key=api_key, base_url=base_url, temperature=0.1)


def generate_from_transcript(transcript: str, instruction: str, model_name: str = "openai/gpt-4o-mini") -> str:
    """Generate learning material using only the supplied transcript."""
    if not transcript.strip():
        raise ProcessingError("Cannot process an empty transcript.")
    prompt = (
        "Use only the transcript below. Do not add facts that are not present in it. "
        f"{instruction}\n\nTranscript:\n{transcript}"
    )
    try:
        return _response_text(_get_llm(model_name).invoke(prompt))
    except Exception as exc:
        raise ProcessingError(f"Unable to generate learning material: {exc}") from exc


def translate_transcript(transcript: str, target_language: str = "English", model_name: str = "openai/gpt-4o-mini") -> str:
    # LLMs have a max output limit, which is hit quickly on long transcripts.
    # We chunk the transcript to ensure full translation.
    if len(transcript) < 12000:
        return generate_from_transcript(
            transcript,
            f"Translate the transcript into clear {target_language}. Preserve the meaning and use plain paragraphs. Do not summarize or omit anything.",
            model_name
        )
    
    separators = ["\n\n", "\n", "。", "！", "？", "，", " ", ""]
    splitter = RecursiveCharacterTextSplitter(chunk_size=4000, chunk_overlap=0, separators=separators)
    chunks = splitter.split_text(transcript)
    
    translated_parts = []
    for chunk in chunks:
        part = generate_from_transcript(
            chunk,
            f"Translate this chunk of a larger transcript into clear {target_language}. Output ONLY the translated text, without any introductory or concluding remarks. Preserve the exact meaning. Do not summarize, truncate, or skip any content.",
            model_name
        )
        translated_parts.append(part.strip())
        
    return "\n\n".join(translated_parts)


def generate_detailed_summary(transcript: str, model_name: str = "openai/gpt-4o-mini") -> str:
    return generate_from_transcript(
        transcript,
        "Write a detailed, structured educational summary with headings for the main topics, key points, "
        "important definitions, and a concise conclusion.",
        model_name
    )


def generate_quiz_questions(transcript: str, count: int, model_name: str = "openai/gpt-4o-mini") -> list[dict]:
    """Generate grounded English MCQs. Correct answers remain server-side for evaluation."""
    raw = generate_from_transcript(
        transcript,
        "Create exactly " + str(count) + " multiple-choice quiz questions. The generated questions, options, correct answers, concepts, and explanations MUST be entirely in English, regardless of the transcript language. Return JSON only in this form: "
        '{"questions":[{"question":"...","options":["...","...","...","..."],'
        '"correct_answer":"exact option text","concept":"short topic","explanation":"..."}]}. ',
        model_name
    )

    try:
        import json
        import re
        match = re.search(r"\{.*\}", raw.replace("\n", ""))
        if match:
            parsed = json.loads(match.group(0))
            return parsed.get("questions", [])
        return json.loads(raw).get("questions", [])
    except Exception as exc:
        raise ProcessingError("Failed to parse generated quiz questions.") from exc


def generate_flashcards(transcript: str, count: int, model_name: str = "openai/gpt-4o-mini") -> list[dict]:
    """Generate English revision flashcards."""
    raw = generate_from_transcript(
        transcript,
        "Extract exactly " + str(count) + " key concepts and generate flashcards. The generated flashcards MUST be entirely in English, regardless of the transcript language. Return JSON only in this form: "
        '{"flashcards":[{"front":"...","back":"...","concept":"..."}]}.',
        model_name
    )
    try:
        import json
        import re
        match = re.search(r"\{.*\}", raw.replace("\n", ""))
        if match:
            parsed = json.loads(match.group(0))
            return parsed.get("flashcards", [])
        return json.loads(raw).get("flashcards", [])
    except Exception as exc:
        raise ProcessingError("Failed to parse generated flashcards.") from exc


def generate_notes(transcript: str, model_name: str = "openai/gpt-4o-mini") -> str:
    return generate_from_transcript(
        transcript,
        "Create a clean, structured set of study notes based on this transcript. "
        "The generated notes MUST be entirely in clear, readable English, regardless of the transcript language. "
        "Use Markdown headers, bullet points, and bold text for key terms. "
        "Do not include conversational filler like 'Here are your notes'.",
        model_name
    )
