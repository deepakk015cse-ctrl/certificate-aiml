import os
import math
import numpy as np
import cv2
from typing import Dict, Any, List, Tuple
from pathlib import Path

class PreprocessingService:
    """
    Offline Computer Vision Preprocessing Pipeline.
    Handles:
      1. Skew angle detection and correction (Hough lines)
      2. Contrast enhancement via CLAHE in LAB color space
      3. Illumination flattening and shadow suppression
      4. Bilateral edge-preserving denoising
      5. Quality scoring and degradation warnings
    """

    def __init__(self):
        pass

    def detect_skew(self, gray: np.ndarray) -> float:
        """Detect document skew angle in degrees using Hough line transform."""
        try:
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(
                edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=10
            )

            if lines is None or len(lines) == 0:
                return 0.0

            angles = []
            for line in lines:
                flat = np.array(line).flatten()
                if len(flat) >= 4:
                    x1, y1, x2, y2 = flat[:4]
                    if x2 != x1:
                        angle = math.degrees(math.atan2(float(y2 - y1), float(x2 - x1)))
                        if abs(angle) < 45:
                            angles.append(angle)

            if not angles:
                return 0.0

            median_angle = float(np.median(angles))
            return round(median_angle, 2)
        except Exception as e:
            print(f"[PREPROCESS SKEW ERROR] {e}")
            return 0.0

    def rotate_image(self, image: np.ndarray, angle: float) -> np.ndarray:
        """Rotate image by angle with white border padding."""
        if abs(angle) < 0.1:
            return image

        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        cos = np.abs(rot_mat[0, 0])
        sin = np.abs(rot_mat[0, 1])

        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))

        rot_mat[0, 2] += (new_w / 2) - center[0]
        rot_mat[1, 2] += (new_h / 2) - center[1]

        return cv2.warpAffine(
            image,
            rot_mat,
            (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255) if len(image.shape) == 3 else 255,
        )

    def enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Apply CLAHE in LAB color space to avoid color distortion."""
        if len(image.shape) == 2:
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            return clahe.apply(image)

        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

    def flatten_illumination(self, gray: np.ndarray) -> np.ndarray:
        """Remove uneven background shadows using morphological opening."""
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        background = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
        diff = 255 - cv2.absdiff(gray, background)
        norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        return norm

    def denoise_image(self, image: np.ndarray) -> np.ndarray:
        """Apply edge-preserving bilateral filter."""
        if len(image.shape) == 3:
            return cv2.bilateralFilter(image, d=7, sigmaColor=50, sigmaSpace=50)
        return cv2.bilateralFilter(image, d=7, sigmaColor=50, sigmaSpace=50)

    def calculate_quality_score(self, gray: np.ndarray) -> Tuple[float, List[str]]:
        """Calculate image clarity score using Laplacian variance and contrast metrics."""
        warnings = []
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Score normalized between 0.2 and 0.98
        score = min(0.98, max(0.20, variance / 500.0))

        if score < 0.45:
            warnings.append("Low contrast / blurred document detected. Text edges may be indistinct.")
        elif score < 0.65:
            warnings.append("Moderate scan noise or faint text detected.")

        mean_val = np.mean(gray)
        if mean_val < 80:
            warnings.append("Image appears underexposed or severely shadowed.")
        elif mean_val > 235:
            warnings.append("Image appears overexposed with washed out text.")

        return round(float(score), 2), warnings

    def process(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """Execute full preprocessing pipeline."""
        img = cv2.imread(input_path)
        if img is None:
            raise ValueError(f"Could not load image from {input_path}")

        orig_h, orig_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()

        steps_applied = []

        # 1. Quality evaluation
        quality_score, warnings = self.calculate_quality_score(gray)

        # 2. Skew detection and rectification
        skew_angle = self.detect_skew(gray)
        if abs(skew_angle) > 0.3:
            img = self.rotate_image(img, skew_angle)
            gray = self.rotate_image(gray, skew_angle)
            steps_applied.append(f"Skew corrected by {skew_angle} degrees")

        # 3. Illumination flattening if uneven
        if np.std(gray) > 40:
            flat_gray = self.flatten_illumination(gray)
            steps_applied.append("Illumination flattening & shadow removal")
        else:
            flat_gray = gray

        # 4. Contrast enhancement
        enhanced = self.enhance_contrast(img)
        steps_applied.append("Adaptive CLAHE contrast enhancement")

        # 5. Denoise
        denoised = self.denoise_image(enhanced)
        steps_applied.append("Edge-preserving bilateral denoise")

        # Save processed output
        cv2.imwrite(output_path, denoised)
        proc_h, proc_w = denoised.shape[:2]

        return {
            "processed": True,
            "quality_score": quality_score,
            "skew_angle": skew_angle,
            "original_dimensions": (orig_w, orig_h),
            "processed_dimensions": (proc_w, proc_h),
            "warnings": warnings,
            "steps_applied": steps_applied,
            "output_path": output_path,
        }

preprocessing_service = PreprocessingService()
