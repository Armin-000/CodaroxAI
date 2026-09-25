import { useRef, useState } from "react";
import { ATTACHMENT_LIMITS } from "../../../config/constants.js";
import { createId } from "../../../lib/ids.js";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsText(file);
  });
}

export function useAttachments() {
  const [attachments, setAttachments] = useState([]);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  async function prepareFiles(fileList) {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    const remainingSlots = Math.max(0, ATTACHMENT_LIMITS.maxFiles - attachments.length);
    if (!remainingSlots) {
      window.alert(`You can attach up to ${ATTACHMENT_LIMITS.maxFiles} files per message.`);
      return;
    }
    const files = picked.slice(0, remainingSlots);
    const currentBytes = attachments.reduce((total, item) => total + Number(item.size || 0), 0);
    const newBytes = files.reduce((total, file) => total + file.size, 0);
    if (currentBytes + newBytes > ATTACHMENT_LIMITS.maxTotalSize) {
      window.alert("Attachments can be up to 16 MB in total.");
      return;
    }

    const prepared = [];
    for (const file of files) {
      if (file.size > ATTACHMENT_LIMITS.maxFileSize) {
        window.alert(`${file.name} is larger than 8 MB.`);
        continue;
      }
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type);
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isText = ["txt", "md", "csv", "json", "js", "jsx", "ts", "tsx", "html", "css", "py", "java", "c", "cpp", "h"].includes(extension);
      if (!isImage && !isPdf && !isText) {
        window.alert(`${file.name} is not supported yet.`);
        continue;
      }
      if (isText && file.size > ATTACHMENT_LIMITS.maxTextSize) {
        window.alert(`${file.name} is too large. Text/code files are limited to 1 MB.`);
        continue;
      }
      if (isImage) {
        prepared.push({ id: createId(), name: file.name, type: file.type, kind: "image", size: file.size, data: await readFileAsDataURL(file) });
      } else if (isPdf) {
        let data = await readFileAsDataURL(file);
        if (!data.startsWith("data:application/pdf;base64,")) {
          const comma = data.indexOf(",");
          if (comma !== -1) data = `data:application/pdf;base64,${data.slice(comma + 1)}`;
        }
        prepared.push({ id: createId(), name: file.name, type: "application/pdf", kind: "pdf", size: file.size, data });
      } else {
        prepared.push({ id: createId(), name: file.name, type: file.type || "text/plain", kind: "text", size: file.size, text: await readFileAsText(file) });
      }
    }
    setAttachments((current) => [...current, ...prepared].slice(0, ATTACHMENT_LIMITS.maxFiles));
  }

  function handleAttachmentChange(event) {
    prepareFiles(event.target.files);
    event.target.value = "";
  }

  function handleComposerPaste(event) {
    const files = Array.from(event.clipboardData?.files || []);
    if (!files.length) return;
    event.preventDefault();
    prepareFiles(files);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    prepareFiles(event.dataTransfer?.files || []);
  }

  const removeAttachment = (id) => setAttachments((current) => current.filter((item) => item.id !== id));
  const removeActiveDocument = (id) => setActiveDocuments((current) => current.filter((item) => item.id !== id));

  return {
    attachments,
    setAttachments,
    activeDocuments,
    setActiveDocuments,
    dragActive,
    setDragActive,
    fileInputRef,
    prepareFiles,
    handleAttachmentChange,
    handleComposerPaste,
    handleDrop,
    removeAttachment,
    removeActiveDocument,
  };
}
