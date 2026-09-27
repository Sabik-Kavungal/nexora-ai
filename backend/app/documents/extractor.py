import io
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument

class TextExtractor:
    @staticmethod
    def extract(file_bytes: bytes, filename: str) -> Tuple[str, List[Dict[str, Any]]]:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        pages: List[Dict[str, Any]] = []

        if ext == "pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            full_text_parts = []
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                pages.append({"page_number": idx + 1, "text": page_text})
                full_text_parts.append(page_text)
            return "\n\n".join(full_text_parts), pages

        elif ext == "docx":
            doc = DocxDocument(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            # Estimate pages roughly
            pages = [{"page_number": 1, "text": full_text}]
            return full_text, pages

        elif ext in ["txt", "md", "markdown"]:
            text = file_bytes.decode("utf-8", errors="replace")
            pages = [{"page_number": 1, "text": text}]
            return text, pages

        else:
            raise ValueError(f"Unsupported file format: .{ext}. Supported formats: PDF, DOCX, TXT, Markdown.")
