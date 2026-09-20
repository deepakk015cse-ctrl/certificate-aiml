import os
import cv2
import numpy as np
from PIL import Image

def read_image_safe(file_path: str) -> np.ndarray:
    """Reads an image safely handling non-ASCII paths and format variances."""
    # Convert PDF if needed
    lower_path = file_path.lower()
    if lower_path.endswith(".pdf"):
        # If pdf2image is available and poppler is installed, or fallback with pypdf
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(file_path, first_page=1, last_page=1)
            if pages:
                pil_img = pages[0].convert("RGB")
                return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception:
            pass

    # Read using Pillow first to handle various color profiles and exotic formats cleanly
    try:
        pil_img = Image.open(file_path)
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception:
        pass

    # Fallback to OpenCV
    img = cv2.imread(file_path)
    if img is None:
        raise ValueError(f"Could not decode image at {file_path}")
    return img

def save_image_safe(image: np.ndarray, output_path: str) -> bool:
    """Saves an image to disk ensuring parent directories exist."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Use cv2.imwrite
    return cv2.imwrite(output_path, image)
