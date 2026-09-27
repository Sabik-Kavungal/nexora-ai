import re
from typing import List, Dict, Any

class DocumentChunker:
    @staticmethod
    def clean_text(text: str) -> str:
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
        return text.strip()

    @classmethod
    def chunk(
        cls,
        pages: List[Dict[str, Any]],
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        global_index = 0

        for page in pages:
            page_text = cls.clean_text(page.get("text", ""))
            page_num = page.get("page_number", 1)
            if not page_text or len(page_text.strip()) == 0:
                continue

            sub_chunks = cls._split_into_chunks(page_text, chunk_size, chunk_overlap)
            for item in sub_chunks:
                if len(item.strip()) < 20:
                    continue
                chunks.append({
                    "chunk_index": global_index,
                    "content": item.strip(),
                    "page_number": page_num,
                    "metadata": {"char_count": len(item), "page_number": page_num}
                })
                global_index += 1

        return chunks

    @staticmethod
    def _split_into_chunks(text: str, max_chunk_size: int, overlap: int) -> List[str]:
        if len(text) <= max_chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + max_chunk_size
            if end >= len(text):
                chunks.append(text[start:])
                break

            search_window = text[max(start, end - 150): min(len(text), end + 50)]
            window_offset = max(start, end - 150)
            split_point = -1

            para_break = search_window.rfind("\n\n")
            if para_break != -1:
                split_point = window_offset + para_break + 2
            else:
                sent_match = re.search(r"[.!?]\s+(?=[A-Z0-9])", search_window)
                if sent_match:
                    split_point = window_offset + sent_match.end()
                else:
                    space_break = search_window.rfind(" ")
                    if space_break != -1:
                        split_point = window_offset + space_break + 1

            if split_point == -1 or split_point <= start:
                split_point = end

            chunks.append(text[start:split_point].strip())
            step = split_point - start
            start = split_point if step <= overlap else split_point - overlap

        return chunks
