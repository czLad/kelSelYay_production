"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

//using Nominatim for geocoding
const getCoordinates = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
};

export default function ReportMissingPerson({ onClose, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    reporterName: "",
    missingPersonName: "",
    phoneNumber: "",
    missingPersonDescription: "",
    relationshipToReporter: "",
    locationOfMissingPerson: "",
    timeSinceMissing: "",
    imageUrl: "", // optional, use imagePreview if needed
  });

  const [fieldErrors, setFieldErrors] = useState({
    reporterName: false,
    missingPersonName: false,
    phoneNumber: false,
    locationOfMissingPerson: false,
    missingImage: false,
    timeSinceMissing: false
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [missingInput, setMissingInput] = useState(false);
  const {t} = useLanguage();


  const clearError = (updatedErrors) => {
    setFieldErrors(updatedErrors);
      
    // Check if any fields still have errors
    let hasErrors = false;
    for (const key in updatedErrors) {
      if (updatedErrors[key] === true) { // Look for TRUE (meaning errors)
        hasErrors = true;
        break;
      }
    }
    setMissingInput(hasErrors);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  
    // Clear error for this field if it has a value
    if (value.trim() !== '') {
      // Update field errors with the new value for this field
      const updatedErrors = {
        ...fieldErrors,
        [name]: false
      };
      
      clearError(updatedErrors);
      
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file)
    {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      const updatedErrors = {
        ...fieldErrors,
        missingImage: false
      };
      
      clearError(updatedErrors);
    }
  };

  const checkEmpty = () => {
    const requiredFields = [
      'reporterName', 
      'missingPersonName', 
      'phoneNumber', 
      'locationOfMissingPerson',
      `timeSinceMissing`
    ];

    let hasErrors = false;
    const newFieldErrors = {}

    requiredFields.forEach(field => {
      if(!formData[field] || formData[field].trim() === ''){
        newFieldErrors[field] = true;
        hasErrors = true
      } else {
        newFieldErrors[field] = false;
      }
    })

    if (!imageFile) {
      newFieldErrors.missingImage = true;
      hasErrors = true;
    } else {
      newFieldErrors.missingImage = false;
    }
    setFieldErrors(newFieldErrors);
    setMissingInput(hasErrors);

    return !hasErrors
  }

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      
      if(!checkEmpty()){
        setIsSaving(false)
        return
      }

      let finalImageUrl = "";

      if (imageFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", imageFile);

        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!uploadPreset || !cloudName) {
          throw new Error("Missing Cloudinary config");
        }

        formDataUpload.append("upload_preset", uploadPreset);
        formDataUpload.append("folder", "Missing People Pictures");

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formDataUpload,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Failed to upload image");
        }

        const cloudinaryData = await res.json();
        finalImageUrl = cloudinaryData.secure_url;
      } else {
        finalImageUrl = "https://picsum.photos/200/300";
      }
      //geocode user's location with nominatim
      const coords = await getCoordinates(formData.locationOfMissingPerson);

      if (!coords) {
          alert(`❌ Invalid location. Please enter a valid city name or landmark.`);
          setIsSaving(false);
          return;
      }

      const payload = { 
          ...formData, 
          imageUrl: finalImageUrl,
          lat: coords.lat,
          lng: coords.lng
      };

      const response = await fetch("http://localhost:3002/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      console.log("✅ Report submitted successfully:", data);

      if(onSubmitSuccess){
        onSubmitSuccess(data)
      }
      
      onClose();
    } catch (error) {
      console.error("🚨 Error submitting report:", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Close Button */}
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="modal-title">{t("Report Missing Person")}</h2>
        {missingInput && (
          <div className="error-message">
            {t("Please fill in all required fields")}
          </div>
        )}
        {/* Form */}
        <div className="modal-body">
          <div className="form-section">
            <div className="photo-and-inputs">
              <div className="image-upload-container">
                <label htmlFor="imageUpload" className="upload-box">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  ) : (
                    <span className="upload-placeholder">{t("Click to upload photo")}</span>
                  )}
                </label>
                {fieldErrors.missingImage && (
                  <div className="field-error-message">{t("Please upload a photo")}</div>
                )}
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  className={`form-input ${fieldErrors.missingImage ? 'input-error' : ''}`}

                />
                {/* Only visible on mobile */}
                {/* <div className="time-mobile-wrapper">
                  <input
                    name="timeSinceMissing"
                    value={formData.timeSinceMissing}
                    onChange={handleChange}
                    placeholder="Time Missing (e.g. 24)"
                    className="form-input time-mobile"
                    type="number"
                  />
                </div> */}
                <div className="time-mobile-wrapper">
                  <div className="form-input input-with-unit time-mobile-wrapper-box">
                    <input
                      name="timeSinceMissing"
                      value={formData.timeSinceMissing}
                      onChange={handleChange}
                      placeholder={t("Time Since Missing")}
                      className="inner-time-input"
                      type="number"
                    />
                    <span className="unit-label">{t("Days")}</span>
                  </div>
                </div>
                
              </div>
              
              <div className="input-column">
              <input
                  name="missingPersonName"
                  value={formData.missingPersonName}
                  onChange={handleChange}
                  placeholder={t("Missing Person's Name")}
                  className={`form-input ${fieldErrors.missingPersonName ? 'input-error' : ''}`}
                />
                {fieldErrors.missingPersonName && (
                  <div className="field-error-message">{t("Name is required")}</div>
                )}

                <input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder={t("Contact Number")}
                  className={`form-input ${fieldErrors.phoneNumber ? 'input-error' : ''}`}
                />
                {fieldErrors.phoneNumber && (
                  <div className="field-error-message">{t("Phone number is required")}</div>
                )}
                <input
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleChange}
                  placeholder={t("Reported By")}
                  className={`form-input ${fieldErrors.reporterName ? 'input-error' : ''}`}
                />
                {fieldErrors.reporterName && (
                  <div className="field-error-message">{t("Reporter name is required")}</div>
                )}
                <input
                  name="relationshipToReporter"
                  value={formData.relationshipToReporter}
                  onChange={handleChange}
                  placeholder={t("Relation to Reporter")}
                  className="form-input"
                />
                {/* Only visible on desktop */}
                {/* <input
                  name="timeSinceMissing"
                  value={formData.timeSinceMissing}
                  onChange={handleChange}
                  placeholder={t("Time Since Missing (e.g. 24)")}
                  className="form-input time-desktop"
                  type="number"
                /> */}
                <div className="form-input input-with-unit time-desktop-wrapper">
                  <input
                    name="timeSinceMissing"
                    value={formData.timeSinceMissing}
                    onChange={handleChange}
                    placeholder={t("Time Since Missing (e.g. 24)")}
                    className="inner-time-input"
                    type="number"
                  />
                  <span className="unit-label">{t("Days")}</span>
                </div>
              </div>
            </div>

            <input
              name="locationOfMissingPerson"
              value={formData.locationOfMissingPerson}
              onChange={handleChange}
              placeholder={t("Last Known Location")}
              className={`form-input ${fieldErrors.locationOfMissingPerson ? 'input-error' : ''}`}
              />

            <textarea
              name="missingPersonDescription"
              value={formData.missingPersonDescription}
              onChange={handleChange}
              placeholder={t("Description")}
              rows="4"
              className="form-input"
            />
          </div>

          {/* Buttons */}
          <div className="modal-footer">
            <button onClick={handleSubmit} className="action-button">
              {t("Submit")}
            </button>
            <button onClick={onClose} className="action-button">
              {t("Close")}
            </button>
          </div>
        </div>
      </div>

      {/* Add this right after opening <div className="modal-content"> */}
      {isSaving && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>{t("Submitting report...")}</p>
          </div>
        </div>
      )}

      <style jsx>{`
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        z-index: 1000;
      }

      .modal-content {
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        background: rgba(20, 20, 20, 0.85);
        border-radius: 16px;
        padding: 2rem;
        color: #fff;
        position: relative;
      }

      .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: color 0.3s ease;
      }

      .close-button:hover {
        color: white;
      }

      .modal-title {
        text-align: center;
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        background: linear-gradient(90deg,rgb(247, 247, 247),rgb(246, 246, 250));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .modal-body {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .photo-and-inputs {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .image-upload-container {
        flex: 1;
        min-width: 160px;
        margin-bottom: 1rem;
      }

      .upload-box {
        height: 240px;
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: border 0.3s ease;
      }

      .upload-box:hover {
        border-color: #646cff;
      }

      .upload-placeholder {
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.9rem;
        text-align: center;
        padding: 0 0.5rem;
      }

      .image-preview {
        height: 100%;
        width: auto;
        object-fit: contain;
        border-radius: 8px;
      }

      .input-column {
        flex: 2;
        display: flex;
        flex-direction: column;
        gap: 0.05rem;
        min-width: 200px;
      }

      .form-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.5rem;
        color: white;
        font-size: 0.95rem;
        width: 100%;
      }

      .input-column .form-input{
        padding: 0.5rem;
      }

      .form-input.textarea {
        min-height: 1000px;
      }

      input.form-input {
        margin-bottom: 0.5rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
      }

      .action-button {
        background: red;
        color: white;
        border: 1px solid rgba(100, 108, 255, 0.4);
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .action-button:hover {
        background: rgba(100, 108, 255, 0.3);
      }

      .time-mobile-wrapper {
        display: none;
      }

      .time-desktop {
        display: block;
      }
      
      .time-desktop-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-right: 1rem;
        position: relative;
      }

      .time-desktop-wrapper .inner-time-input {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        font-size: 0.95rem;
        padding: 0;
        margin: 0;
        outline: none;
      }

      .time-desktop-wrapper .unit-label {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.95rem;
        white-space: nowrap;
        margin-left: 0.5rem;
      }

      .time-mobile-wrapper-box {
        width: 100%;
        max-width: 160px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }
            
      .time-mobile-wrapper-box .inner-time-input {
        background: transparent;
        border: none;
        color: white;
        font-size: 0.75rem;
        width: 100%;
        outline: none;
      }
            
      .time-mobile-wrapper-box .unit-label {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
        margin-left: 0.5rem;
        // padding-top: 1px; /* adjust this to match baseline */
        white-space: nowrap;
      }

    @media (max-width: 767px) {
      .modal-content {
        max-height: 95vh;
        padding: 1rem;
      }
          
      .modal-title {
        font-size: 1.5rem;
        margin-bottom: 1rem;
      }
          
      .photo-and-inputs {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        flex-wrap: nowrap;
      }
          
      .image-upload-container {
        width: 40%;
        min-width: 120px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
          
      .upload-box {
        height: 140px;
      }
          
      .input-column {
        width: 55%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
          
      .form-input {
        font-size: 0.9rem;
        padding: 0.6rem;
      }
          
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
          
      input.form-input,
      textarea.form-input {
        margin-bottom: 0.5rem;
      }
          
      .modal-body {
        gap: 1.2rem;
      }
          
      .modal-footer {
        flex-direction: row;
        justify-content: space-between;
      }
          
      .action-button {
        flex: 1;
        padding: 0.6rem;
        font-size: 0.9rem;
      }
      
      .time-desktop {
        display: none;
      }
          
      .time-mobile-wrapper {
        display: block;
        margin-top: 1.70rem;
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .time-mobile-wrapper input::placeholder {
        font-size: 0.52rem; /* or whatever size you want */
      }
          
      .time-mobile {
        width: 100%;
        max-width: 160px;
        height: 40px;
        font-size: 0.75rem;
        padding: 0.2rem 0.2rem;
      }
      
      .time-mobile-wrapper .unit-label {
        padding-top: 2.2px;
        font-size: 0.52rem;
      }
      
      .time-desktop-wrapper {
        display: none;
      }
    }
    @media (max-width: 424px) {
      .photo-and-inputs {
        flex-wrap: nowrap;
      }

      .image-upload-container {
        width: 38%; /* stays compact */
      }

      .upload-box {
        height: 140px; /* reduce image height a bit more */
      }

      .input-column {
        width: 58%;
        min-width: 0; /* override the 200px */
        gap: 0.4rem;
      }

      .form-input {
        font-size: 0.85rem;
        padding: 0.5rem;
      }

      .modal-title {
        font-size: 1.35rem;
      }

      .action-button {
        font-size: 0.85rem;
        padding: 0.5rem;
      }
      
      .time-mobile-wrapper input::placeholder {
        font-size: 0.52rem; /* or whatever size you want */
      }
      
      .time-mobile-wrapper {
        margin-top: 1.1rem;
      }

    }
      
    @media (max-width: 320px) {
      .modal-title {
        font-size: 1.1rem; /* or try 1.1rem if needed */
        line-height: 1.4;
      }
      .time-mobile-wrapper input::placeholder {
        font-size: 0.52rem; /* or whatever size you want */
      }
      
      .time-mobile-wrapper {
        margin-top: 1.05rem;
      }
    }

      .input-error {
        border: 2px solid #ff4d4d;
        background: rgba(255, 77, 77, 0.1);
      }
      
      .error-message {
        color: #ff4d4d;
        text-align: center;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        background: rgba(255, 77, 77, 0.15);
        border-radius: 8px;
        font-size: 0.9rem;
      }
      
      /* Shake animation for error fields */
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      .input-error {
        animation: shake 0.6s;
      }
      .field-error-message {
        color: #ff4d4d;
        font-size: 0.75rem;
        margin-top: -0.3rem;
        margin-bottom: 0.3rem;
        padding-left: 0.5rem;
      }

      /* For the image upload error */
      .image-upload-container .field-error-message {
        text-align: center;
        margin-top: 0.3rem;
      }
    `}</style>

    </div>
  );
}