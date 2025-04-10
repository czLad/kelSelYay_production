"use client";

import { useState } from "react";
import ReportMissingPerson from "./ReportMissingPerson";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "../context/LanguageContext";
import { lockZoom, unlockZoom } from "@/utils/viewportHelper";

export default function AddReportButton({ onReportSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const handleOpen = () => {
    setIsOpen(true);
    lockZoom(); // Prevent zoom on iOS Safari
  };

  const handleReportSuccess=(newReport, existedCoor) => {
    setIsOpen(false);

    if(onReportSubmitted){
      onReportSubmitted(newReport, existedCoor)
    }
  }

  const handleClose = () => {
    setIsOpen(false);
    unlockZoom(); // Restore zoom behavior
  };

  return (
    <>
    <button
      className="add-report-button"
      onClick={handleOpen}
      aria-label="Add Report"
    >
      <FontAwesomeIcon icon={faUser} className="icon" />
      <span className="label">{t("Report Missing Person")}</span> 
    </button>

    {isOpen && <ReportMissingPerson 
                      onClose={handleClose} 
                      onSubmitSuccess={handleReportSuccess}
                    />}

    <style jsx>{`
    .add-report-button {
      position: fixed;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background-color: red;
      color: white;
      border: none;
      border-radius: 9999px;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;  /* ✅ proper spacing */
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      z-index: 999;
      transition: background-color 0.3s ease;
      width: 80%;
      max-width: 240px;
    }

    @media (min-width: 640px) {
      .add-report-button {
        padding: 0.7rem 1.4rem;
        font-size: 1.05rem;
        max-width: 260px;
      }
    }

    @media (min-width: 1024px) {
      .add-report-button {
        padding: 0.8rem 1.6rem;
        font-size: 1.1rem;
        max-width: 280px;
      }
    }

    .add-report-button:hover {
      background-color: darkred;
    }

    .icon {
      font-size: 1.1rem;
    }

    .label {
      line-height: 1;
    }

    @media (max-width: 320px) {
      .add-report-button {
        padding: 0.8rem 0.4rem;
        font-size: 0.8rem;
        max-width: 180px;
      }
      .icon {
        font-size: 0.6rem;
      }
      
      .label {
        line-height: 0.8;
      }
    }
  `}</style>

    </>
  );
}
