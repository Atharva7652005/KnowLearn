import React, { useState } from "react";
import { CheckCircle2, RefreshCcw } from "lucide-react";
import { api } from "../api";

export default function PlanPricing({ session, onUserUpdate }) {
  const plans = [
    { name: "Free", price: "₹0", desc: "Basic tools to get started.", features: ["1 upload per day", "1 regeneration per day", "English translations", "Powered by GPT-4o-mini", "Web Speech API (TTS)"] },
    { name: "Basic", price: "₹149", desc: "For casual learners.", features: ["10 uploads per day", "5 AI regenerations", "Hindi support", "Powered by GPT-4o-mini", "Web Speech API (TTS)"] },
    { name: "Pro", price: "₹249", desc: "For dedicated students.", features: ["25 uploads per day", "10 AI regenerations", "All Indian languages", "Powered by GPT-4o", "1 Premium AI Voice / Day"], popular: true },
    { name: "Premium", price: "₹499", desc: "For power users.", features: ["50 uploads per day", "25 AI regenerations", "All global languages", "Powered by GPT-5.6-Luna", "5 Premium AI Voices / Day"] },
  ];

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(null);

  const activePlan = session?.user?.activePlan || "Free";
  const purchasedPlans = session?.user?.purchasedPlans || ["Free"];

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectPlan = async (plan) => {
    if (plan.name === activePlan) return;
    
    // Free plan or already purchased plan
    if (plan.name === "Free" || purchasedPlans.includes(plan.name)) {
      setIsProcessing(true);
      setProcessingPlan(plan.name);
      try {
        const res = await api("/users/plan/switch", {
          method: "POST",
          body: { planName: plan.name },
          token: session?.token
        });
        if (onUserUpdate) onUserUpdate(res.user);
      } catch (err) {
        alert(err.message);
      } finally {
        setIsProcessing(false);
        setProcessingPlan(null);
      }
      return;
    }

    // Razorpay Flow
    setIsProcessing(true);
    setProcessingPlan(plan.name);

    try {
      const res = await loadRazorpay();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(false);
        setProcessingPlan(null);
        return;
      }

      // Create Order
      const orderData = await api("/payment/create-order", {
        method: "POST",
        body: { planName: plan.name },
        token: session?.token
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "KnowLearn",
        description: `Upgrade to ${plan.name} Plan`,
        image: "/logo.svg", // KnowLearn Logo
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            const verifyRes = await api("/payment/verify", {
              method: "POST",
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              token: session?.token
            });
            if (onUserUpdate) onUserUpdate(verifyRes.user);
            alert(`Payment Successful! Upgraded to ${plan.name} Plan.`);
          } catch (err) {
            alert(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: session?.user?.name || "User",
          email: session?.user?.email,
          contact: "9999999999", // Random 10-digit Indian number as requested
        },
        theme: {
          color: "#3B82F6",
        },
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response){
        alert(`Payment failed! Reason: ${response.error.description}`);
      });

      paymentObject.open();

    } catch (error) {
      alert(error.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
      setProcessingPlan(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
        <p className="text-lg text-slate-600">Choose the plan that fits your learning pace.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative bg-white rounded-3xl border ${plan.popular ? 'border-purple-500 shadow-2xl shadow-purple-600/20 lg:-translate-y-4' : 'border-slate-200 shadow-lg shadow-slate-200/50'} p-8 flex flex-col h-full hover:-translate-y-2 transition-transform duration-300`}>
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                Most Popular
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-sm text-slate-500 h-10">{plan.desc}</p>
            </div>
            
            <div className="mb-8">
              <span className="text-4xl font-display font-extrabold text-slate-900">{plan.price}</span>
              <span className="text-slate-500 font-medium">/month</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feat, j) => (
                <li key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className={plan.popular ? "text-purple-600 shrink-0" : "text-blue-500 shrink-0"} />
                  <span className="text-sm text-slate-700 font-medium">{feat}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSelectPlan(plan)}
              disabled={plan.name === activePlan || isProcessing}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing && processingPlan === plan.name ? (
                <><RefreshCcw size={16} className="animate-spin" /> Processing...</>
              ) : (
                plan.name === activePlan ? "Current Plan" : (plan.name === "Free" || purchasedPlans.includes(plan.name)) ? "Switch to " + plan.name : "Upgrade to " + plan.name
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
