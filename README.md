# KnowLearn

KnowLearn is an AI-powered educationa content understanding and learner-analytics framework. It transforms multilingual educational audio or video into structured learning material, grounded question answering, automatically generated assessments, and concept-level grasping estimates.

## Overview

KnowLearn is designed for educational recordings of up to approximately 30 minutes. It extracts educationally meaningful content and supports learners through chat, quizzes, and revision recommendations. 

The learner analysis provides an **estimated grasping level based on observable assessment and interaction performance**. It is not a measurement of a learner's cognitive ability.

### Core Capabilities

- **Intelligent Media Processing**: Upload audio/video files or supply YouTube URLs.
- **Document Translation (Premium)**: Instantly translates `.pptx` and `.docx` files into 15+ global and Indian languages while preserving the original font styles and document formatting. Limited to 2 uploads/day and features a strict 5-minute auto-deletion mechanism for privacy.
- **Automatic Language Detection (ALD)**: Automatically identifies the spoken language of the content and preserves the original transcript.
- **On-Demand Translation**: Translates non-English transcripts to English with a single click, intelligently skipping the process if the content is already in English.
- **Learning Material Generation**: Produces concise summaries, structured study notes, flashcards, key concepts, and definitions.
- **Interactive Chat**: Answer questions using retrieval-augmented generation (RAG) grounded directly in the uploaded content.
- **Quizzes & Assessments**: Generates grounded multiple-choice quizzes to test knowledge retention.
- **Grasping Estimates**: Evaluates quiz performance, highlights weak concepts, and recommends specific topics for revision.

## Technology Stack

The project operates on a robust three-tier architecture:

| Area | Technology |
| --- | --- |
| Frontend | React + Vite, Global Dark/Light Theme |
| Primary Backend | Node.js + Express (JWT Authentication) |
| Database | MongoDB |
| AI Processing Service | Python + FastAPI |
| Speech-to-text / ALD | AssemblyAI Universal transcription model |
| Translation, summaries, chat, quizzes | OpenAI gpt-4o-mini (via LangChain) |
| Embeddings & Vector Storage | Google Generative AI Embeddings + FAISS (Local Disk Persistence) |

## Repository Structure

```text
KnowLearn/
|-- backend/                       # FastAPI AI Processing Application
|   |-- main.py                    # FastAPI entry point
|   |-- model_pipeline.py          # AI integration, RAG, and learning-generation service
|   |-- speech_to_text.py          # AssemblyAI audio/video transcription service
|   |-- content_store.py           # In-memory FAISS store bridge
|   `-- requirements.txt           # Python dependencies
|-- express-backend/               # Node.js/Express API Gateway
|   |-- controllers/               # Route logic (Auth, User, Learning)
|   |-- models/                    # MongoDB schemas (User, LearningContent)
|   |-- routes/                    # Express routing definitions
|   `-- package.json               # Node dependencies
|-- frontend/                      # React/Vite client
|   |-- src/                       # Components, Pages, and Global CSS
|   `-- package.json
`-- README.md
```

## Setup & Installation

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later
- MongoDB instance (local or Atlas cluster)
- A configured `GEMINI_API_KEY` for vector embeddings
- A configured `OPENAI_API_KEY` and `OPENAI_BASE_URL` for LLM capabilities
- A configured `ASSEMBLYAI_API_KEY` for media transcription

### 1. Python AI Backend (FastAPI)

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` and add the provider keys:

```env
GEMINI_API_KEY=your_gemini_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
OPENAI_API_KEY=your_openai_key_here
OPENAI_BASE_URL=https://aicredits.in/v1
OPENAI_MODEL=openai/gpt-4o-mini
```

Start the development server:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Express API Gateway

Open a new terminal window:

```powershell
cd express-backend
npm install
```

Create `express-backend/.env`:

```env
PORT=3000
MONGODB_URL=mongodb://127.0.0.1:27017/knowlearn
JWT_SECRET=your_jwt_secret_here
FASTAPI_URL=http://127.0.0.1:8000
CLIENT_URL=http://localhost:5173

```

Start the Express server:

```powershell
npm run dev
```

### 3. React Frontend

Open a third terminal window:

```powershell
cd frontend
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## Processing Pipeline

```text
Audio/Video Upload OR YouTube Link
        |
Express API Gateway (Auth & MongoDB creation)
        |
FastAPI AI Service (Payload Validation)
        |
AssemblyAI / YouTube Transcript API (Automatic Language Detection)
        |
Original Transcript + Language Tag
        |
OpenAI LLM - gpt-4o-mini (Optional English Translation)
        |
OpenAI LLM - gpt-4o-mini (Summary, Notes, Flashcards, Quizzes)
        |
FAISS Disk-Persistent Vectorization (RAG Chat capability via Gemini Embeddings)
        |
Results saved to MongoDB & returned to User Interface
```
