import React, { useState } from 'react';
import { IssueCategory, IssueSeverity, CurrentUser } from '../types';
import { CAMPUS_LANDMARKS, SAMPLE_ISSUE_PHOTOS } from '../data/campusLocations';
import { MapPin, AlertCircle, Camera, CheckCircle2, Send, Sparkles, AlertTriangle } from 'lucide-react';

interface ReportIssueFormProps {
  pinLocation: { lat: number; lng: number; landmarkName?: string } | null;
  onClearPin: () => void;
  onSubmit: (formData: {
    title: string;
    category: IssueCategory;
    description: string;
    locationName: string;
    lat: number;
    lng: number;
    severity: IssueSeverity;
    isHazard: boolean;
    imageUrl?: string;
  }) => Promise<void>;
  currentUser: CurrentUser;
}

export const ReportIssueForm: React.FC<ReportIssueFormProps> = ({
  pinLocation,
  onClearPin,
  onSubmit,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Electrical');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('Medium');
  const [isHazard, setIsHazard] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [customPhotoName, setCustomPhotoName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File upload handler (converts to base64 data url)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomPhotoName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!pinLocation) {
      setErrorMessage('Please click anywhere on the campus map to place a pin first!');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter an issue title (e.g. Street light broken)');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        title: title.trim(),
        category,
        description: description.trim(),
        locationName: pinLocation.landmarkName || `Campus Sector (${pinLocation.lat}, ${pinLocation.lng})`,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        severity: isHazard ? 'Hazard' : severity,
        isHazard,
        imageUrl: selectedPhoto || undefined,
      });

      // Clear form
      setTitle('');
      setDescription('');
      setSelectedPhoto('');
      setCustomPhotoName('');
      setIsHazard(false);
      setSeverity('Medium');
      setSuccessMessage('Issue reported. SMS delivery status is shown in the confirmation alert.');

      setTimeout(() => {
        setSuccessMessage(null);
      }, 7000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fill preset template for faster demo testing
  const quickFillSample = (sampleType: 'light' | 'pipe' | 'wire' | 'wifi') => {
    if (sampleType === 'light') {
      setTitle('Outdoor pathway floodlight blinking');
      setCategory('Electrical');
      setDescription('Flickering high-mast lamp near Science quadrangle. Strobe effect makes it unsafe for students at night.');
      setIsHazard(false);
      setSeverity('High');
      setSelectedPhoto(SAMPLE_ISSUE_PHOTOS[2].url);
    } else if (sampleType === 'pipe') {
      setTitle('Drinking water tap leaked & flooding lobby');
      setCategory('Plumbing');
      setDescription('Main tap valve loose on Ground floor corridor. Continuous stream of potable water being wasted.');
      setIsHazard(false);
      setSeverity('High');
      setSelectedPhoto(SAMPLE_ISSUE_PHOTOS[1].url);
    } else if (sampleType === 'wire') {
      setTitle('Severed power cable hanging above doorway');
      setCategory('Civil/Safety');
      setDescription('Live wire hanging dangerously low near Room 204 entrance. Students could touch it accidentally.');
      setIsHazard(true);
      setSeverity('Hazard');
      setSelectedPhoto(SAMPLE_ISSUE_PHOTOS[0].url);
    } else if (sampleType === 'wifi') {
      setTitle('Wi-Fi access point dead in Mech Seminar Hall');
      setCategory('Wi-Fi/Network');
      setDescription('SSID KARE-STUDENT-WIFI drops every 2 minutes during project presentations.');
      setIsHazard(false);
      setSeverity('Medium');
      setSelectedPhoto(SAMPLE_ISSUE_PHOTOS[4].url);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 text-slate-800">
      {/* Form Header matching Figure 5 & 6 */}
      <div className="border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <span className="text-red-500">📍</span> Report an issue
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
          <span>1) Click the map to place a pin &nbsp; 2) Fill the form</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {currentUser.regNo}
          </span>
        </div>
      </div>

      {/* Quick Fill Demo helper bar */}
      <div className="mb-3 bg-slate-50 border border-slate-200 rounded p-2 text-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Templates:
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => quickFillSample('light')}
            className="text-[10px] px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 cursor-pointer transition"
          >
            💡 Light Out
          </button>
          <button
            type="button"
            onClick={() => quickFillSample('pipe')}
            className="text-[10px] px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 cursor-pointer transition"
          >
            💧 Water Leak
          </button>
          <button
            type="button"
            onClick={() => quickFillSample('wire')}
            className="text-[10px] px-2 py-0.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-semibold cursor-pointer transition"
          >
            ⚠️ Exposed Wire
          </button>
          <button
            type="button"
            onClick={() => quickFillSample('wifi')}
            className="text-[10px] px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 cursor-pointer transition"
          >
            📶 Wi-Fi Drop
          </button>
        </div>
      </div>

      {/* Form Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Title */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Title <span className="text-slate-400 font-normal">(e.g. Street light broken)</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Street light broken)"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as IssueCategory)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="Electrical">Electrical (Lights, switches, power)</option>
            <option value="Plumbing">Plumbing (Pipes, taps, washrooms)</option>
            <option value="Cleaning">Cleaning (Sanitation, waste, dusting)</option>
            <option value="Wi-Fi/Network">Wi-Fi/Network (Internet, LAN)</option>
            <option value="HVAC">HVAC (Air conditioning, fans, cooling)</option>
            <option value="Civil/Safety">Civil/Safety (Benches, doors, hazards)</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide specific details about the issue location and condition..."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition"
          />
        </div>

        {/* Photo Upload & Sample picker */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Photo Attachment</label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center px-3 py-1.5 border border-slate-300 border-dashed rounded bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs cursor-pointer transition">
              <Camera className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>{customPhotoName || 'Choose File (No file chosen)'}</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Quick Preset Photos */}
          <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">Presets:</span>
            {SAMPLE_ISSUE_PHOTOS.map((sp) => (
              <button
                key={sp.label}
                type="button"
                onClick={() => {
                  setSelectedPhoto(sp.url);
                  setCustomPhotoName(`Preset: ${sp.label}`);
                }}
                className={`text-[10px] px-2 py-0.5 rounded border transition whitespace-nowrap cursor-pointer ${
                  selectedPhoto === sp.url
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {selectedPhoto && (
            <div className="mt-2 relative rounded overflow-hidden border border-slate-200 max-h-24 bg-slate-100 flex items-center justify-center">
              <img src={selectedPhoto} alt="Issue preview" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoto('');
                  setCustomPhotoName('');
                }}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[10px] hover:bg-red-700 shadow"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Hazard / Priority Ranking Toggle */}
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isHazard}
              onChange={(e) => setIsHazard(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 rounded border-amber-300 focus:ring-red-500 cursor-pointer"
            />
            <div>
              <div className="font-bold text-amber-900 flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Immediate Safety Hazard?
              </div>
              <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                Hazards jump straight to the top of priority rankings (+200 pts) and trigger instant SMS alert to Campus Safety.
              </p>
            </div>
          </label>

          {!isHazard && (
            <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Severity:</span>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High'] as IssueSeverity[]).map((sev) => (
                  <label key={sev} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={sev}
                      checked={severity === sev}
                      onChange={() => setSeverity(sev)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={
                        sev === 'High'
                          ? 'text-red-700 font-semibold'
                          : sev === 'Medium'
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }
                    >
                      {sev}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Worker Dispatch Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-base">📲</span>
            <div>
              <div className="font-semibold text-slate-800">Worker dispatch: {category}</div>
              <div className="text-slate-500 text-[10px]">A matching worker is selected when the report is submitted.</div>
            </div>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
            Status after submit
          </span>
        </div>

        {/* Location Display */}
        <div className="py-1">
          {pinLocation ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded text-xs">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{pinLocation.landmarkName || 'Campus Coordinate'}</span>
              </span>
              <button
                type="button"
                onClick={onClearPin}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 underline ml-2 cursor-pointer flex-shrink-0"
              >
                Change pin
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 text-slate-500 px-2.5 py-1.5 rounded text-xs flex items-center justify-between">
              <span>Location: not selected</span>
              <span className="text-[10px] text-blue-600 italic">Click map to drop pin</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 px-4 rounded font-bold text-xs text-white shadow transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isHazard
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
          } ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {submitting ? (
            <span>Submitting & Dispatching SMS...</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Submit report</span>
            </>
          )}
        </button>

        {/* Success confirmation */}
        {successMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold block">Issue reported!</span>
              <span className="text-[11px] text-emerald-700">{successMessage}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
