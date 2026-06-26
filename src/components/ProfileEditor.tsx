import { useState, useRef } from "react";
import { X, Camera, User } from "lucide-react";
import ImageCropModal from "./ImageCropModal";

interface ProfileEditorProps {
  initialName: string;
  initialBio: string;
  initialPhotoUrl: string;
  onSave: (fields: { name?: string; bio?: string; photoUrl?: string }) => void;
  onClose: () => void;
  language: string;
}

export default function ProfileEditor({
  initialName,
  initialBio,
  initialPhotoUrl,
  onSave,
  onClose,
  language,
}: ProfileEditorProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(language === "es" ? "La imagen no puede superar 5MB" : "Image cannot exceed 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropApply = (cropped: string) => {
    setPhotoUrl(cropped);
    setPendingImage(null);
  };

  const handleSave = () => {
    onSave({
      name: name.trim() || initialName,
      bio: bio.trim(),
      photoUrl,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-[440px] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white/90 tracking-wide">
            {language === "es" ? "Editar Perfil" : "Edit Profile"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-white/10 hover:border-white/25 transition-colors cursor-pointer"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <User className="w-10 h-10 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white/80" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-wider font-medium transition-colors"
            >
              {photoUrl
                ? language === "es" ? "Cambiar foto" : "Change photo"
                : language === "es" ? "Subir foto" : "Upload photo"}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2 block">
              {language === "es" ? "Nombre" : "Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/15 focus:outline-none focus:border-white/15 transition-colors"
              placeholder={language === "es" ? "Tu nombre" : "Your name"}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2 block">
              {language === "es" ? "Biografia" : "Bio"}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={120}
              rows={2}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/15 focus:outline-none focus:border-white/15 transition-colors resize-none"
              placeholder={language === "es" ? "Cuéntanos algo sobre ti..." : "Tell us something about you..."}
            />
            <span className="text-[9px] text-white/15 mt-1 block text-right">
              {bio.length}/120
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/40 text-xs font-semibold uppercase tracking-wider hover:bg-white/8 transition-colors"
          >
            {language === "es" ? "Cancelar" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/90 text-xs font-semibold uppercase tracking-wider hover:bg-white/15 transition-colors"
          >
            {language === "es" ? "Guardar" : "Save"}
          </button>
        </div>
      </div>

      {pendingImage && (
        <ImageCropModal
          imageSrc={pendingImage}
          onCrop={handleCropApply}
          onClose={() => setPendingImage(null)}
          language={language}
        />
      )}
    </div>
  );
}
