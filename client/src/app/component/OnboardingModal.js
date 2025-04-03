'use client';

import { useState } from 'react';
import { useLanguage } from "../context/LanguageContext";
import Image from 'next/image';

export default function OnboardingModal({ onFinish }) {
    const [step, setStep] = useState(1);

    const {t} = useLanguage();

    const nextStep = () => setStep(step + 1);

    const finish = () => {
        localStorage.setItem("hasSeenOnboarding", "true");
        onFinish();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white bg-opacity-90 rounded-2xl p-8 w-[90%] max-w-2xl text-center space-y-6 shadow-2xl">

                {step === 1 && (
                    <>
                        <h2 className="text-2xl font-bold">{t('Step 1. How to Use Our App?')}</h2>
                        <Image
                            src="/map2.jpeg"
                            alt="Map Overview"
                            width={800}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <p>The pointers on the map show reports of missing people and supply needs. Each dot represents someone who needs help.</p>
                        <button 
                            onClick={nextStep} 
                            className="bg-blue-500 text-white px-6 py-3 rounded w-full hover:bg-blue-600 transition"
                        >
                            Next
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h2 className="text-2xl font-bold">Step 2 — Reporting</h2>
                        <Image
                            src="/map2.jpeg"
                            alt="Report Form"
                            width={800}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <p>Click the Report button to submit a new report. You can share information about missing people or what supplies are urgently needed in your area.</p>
                        <button 
                            onClick={nextStep} 
                            className="bg-blue-500 text-white px-6 py-3 rounded w-full hover:bg-blue-600 transition"
                        >
                            Next
                        </button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h2 className="text-2xl font-bold">Step 3 — Update Reports</h2>
                        <Image
                            src="/postsubmit.jpeg"
                            alt="Update Reports"
                            width={800}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <p>You or other aid workers can edit reports to mark people as found or update supply statuses when situations change.</p>
                        <button 
                            onClick={nextStep} 
                            className="bg-blue-500 text-white px-6 py-3 rounded w-full hover:bg-blue-600 transition"
                        >
                            Next
                        </button>
                    </>
                )}

                {step === 4 && (
                    <>
                        <h2 className="text-2xl font-bold">Step 4 — Stay Safe</h2>
                        <Image
                            src="/verifybox.jpeg"
                            alt="Safety Notice"
                            width={800}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <p>No login is required. Your reports are anonymous and only viewable by trusted aid workers. Please only report information you believe is accurate and safe to share.</p>
                        <button 
                            onClick={finish} 
                            className="bg-green-500 text-white px-6 py-3 rounded w-full hover:bg-green-600 transition"
                        >
                            Got it!
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
