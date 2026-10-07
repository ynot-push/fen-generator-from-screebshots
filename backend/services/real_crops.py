from functools import lru_cache

import cv2
import numpy as np

OUT = 64

@lru_cache(maxsize=32)
def load_gray(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise FileNotFoundError(path)

    return img


def crop_window(img, cx, cy, w, h, out=OUT):

    x0 = int(round(cx - w / 2))
    x1 = int(round(cx + w / 2))

    y0 = int(round(cy - h / 2))
    y1 = int(round(cy + h / 2))

    x1 = max(x1, x0 + 1)
    y1 = max(y1, y0 + 1)

    H, W = img.shape[:2]

    pad_left = max(0, -x0)
    pad_top = max(0, -y0)
    pad_right = max(0, x1 - W)
    pad_bottom = max(0, y1 - H)

    if pad_left or pad_top or pad_right or pad_bottom:
        img = cv2.copyMakeBorder(
            img,
            pad_top,
            pad_bottom,
            pad_left,
            pad_right,
            cv2.BORDER_REPLICATE,
        )

        x0 += pad_left
        x1 += pad_left
        y0 += pad_top
        y1 += pad_top

    crop = img[y0:y1, x0:x1]

    return cv2.resize(
        crop,
        (out, out),
        interpolation=cv2.INTER_AREA,
    )


def square_crop(
    img,
    box,
    r,
    c,
    dx=0.0,
    dy=0.0,
    scale=1.0,
):

    x0, y0, x1, y1 = box

    sw = (x1 - x0) / 8.0
    sh = (y1 - y0) / 8.0

    cx = x0 + (c + 0.5 + dx) * sw
    cy = y0 + (r + 0.5 + dy) * sh

    return crop_window(
        img,
        cx,
        cy,
        sw * scale,
        sh * scale,
    )

