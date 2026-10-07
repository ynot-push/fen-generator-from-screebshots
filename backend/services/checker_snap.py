
import cv2
import numpy as np

SIGN = np.array([[1 if (i + j) % 2 == 0 else -1 for j in range(8)] for i in range(8)], np.float32)


def _patch_geometry(s):
    p = max(3, int(round(0.22 * s)))
    m = max(1, int(round(0.06 * s)))
    lo, hi = m, s - m - p
    return p, [(lo, lo), (hi, lo), (lo, hi), (hi, hi)]        


def _score_maps(B, s, x_start, y_start, stride, nx, ny, offs):
    
    S1 = np.zeros((ny, nx), np.float32)
    S2 = np.zeros((ny, nx), np.float32)
    Sc = np.zeros((ny, nx), np.float32)
    for i in range(8):
        for j in range(8):
            v = 0
            for ox, oy in offs:
                a, b = y_start + i * s + oy, x_start + j * s + ox
                v = v + B[a:a + stride * ny:stride, b:b + stride * nx:stride][:ny, :nx]
            v = v / len(offs)
            S1 += v
            S2 += v * v
            Sc += SIGN[i, j] * v
    var = np.maximum(S2 - S1 * S1 / 64.0, 1e-3)
    corr = Sc / np.sqrt(64.0 * var)
    contrast = Sc / 32.0                                        # mean(light cells) - mean(dark cells)
    return corr * np.clip(contrast / 12.0, -1.0, 1.0), corr, contrast


def checker_score(gray, box):
 
    g = np.asarray(gray, np.float32)
    x0, y0, x1, y1 = box
    s = int(round(((x1 - x0) + (y1 - y0)) / 16.0))
    H, W = g.shape
    p, offs = _patch_geometry(s)
    xi, yi = int(round(x0)), int(round(y0))
    if s < 8 or xi < 0 or yi < 0 or xi + 8 * s >= W or yi + 8 * s >= H:
        return -1.0
    B = cv2.boxFilter(g, cv2.CV_32F, (p, p), anchor=(0, 0), borderType=cv2.BORDER_REPLICATE)
    sc, _, _ = _score_maps(B, s, xi, yi, 1, 1, 1, offs)
    return float(sc[0, 0])


def snap_checkerboard(gray, rough_box=None, scale_range=(0.5, 1.9), shift=3.0, stride=3):
    g = np.asarray(gray, np.float32)
    H, W = g.shape
    if rough_box is None:
        s_det = min(H, W) / 12.0
        x0d, y0d = W / 2 - 4 * s_det, H / 2 - 4 * s_det
        shift_px_x, shift_px_y = W / 2, H / 2
        scale_range = (0.35, 1.6)
    else:
        x0d, y0d, x1d, y1d = [float(v) for v in rough_box]
        s_det = ((x1d - x0d) + (y1d - y0d)) / 16.0
        shift_px_x = shift_px_y = shift * s_det

    s_lo = max(10, int(s_det * scale_range[0]))
    s_hi = min(int(s_det * scale_range[1]), int(min(H, W) / 8) - 1)
    scales, s = [], s_lo
    while s <= s_hi:
        scales.append(s)
        s = max(s + 1, int(round(s * 1.015)))

    best = (-9.0, None)
    for s in scales:
        p, offs = _patch_geometry(s)
        B = cv2.boxFilter(g, cv2.CV_32F, (p, p), anchor=(0, 0), borderType=cv2.BORDER_REPLICATE)
        x_min = max(0, int(x0d - shift_px_x))
        y_min = max(0, int(y0d - shift_px_y))
        x_max = min(W - 8 * s - 2, int(x0d + shift_px_x))
        y_max = min(H - 8 * s - 2, int(y0d + shift_px_y))
        if x_max < x_min or y_max < y_min:
            continue
        nx, ny = (x_max - x_min) // stride + 1, (y_max - y_min) // stride + 1
        sc, _, _ = _score_maps(B, s, x_min, y_min, stride, nx, ny, offs)
        k = int(np.argmax(sc))
        iy, ix = divmod(k, nx)
        if sc[iy, ix] > best[0]:
            best = (float(sc[iy, ix]), (x_min + ix * stride, y_min + iy * stride, s))

    if best[1] is None:
        return None, -1.0
    
    _, (bx, by, bs) = best
    fine = (-9.0, None)
    for s in (bs - 1, bs, bs + 1):
        if s < 8:
            continue
        p, offs = _patch_geometry(s)
        B = cv2.boxFilter(g, cv2.CV_32F, (p, p), anchor=(0, 0), borderType=cv2.BORDER_REPLICATE)
        xs, ys = max(0, bx - stride), max(0, by - stride)
        nx = min(2 * stride + 1, W - 8 * s - 2 - xs)
        ny = min(2 * stride + 1, H - 8 * s - 2 - ys)
        if nx < 1 or ny < 1:
            continue
        sc, _, _ = _score_maps(B, s, xs, ys, 1, nx, ny, offs)
        k = int(np.argmax(sc))
        iy, ix = divmod(k, nx)
        if sc[iy, ix] > fine[0]:
            fine = (float(sc[iy, ix]), (xs + ix, ys + iy, s))
    sc, (x, y, s) = fine
    return (float(x), float(y), float(x + 8 * s), float(y + 8 * s)), sc


def _fine_fit(g, B, p, m, box):
    x0, y0, x1, y1 = box
    sx, sy = (x1 - x0) / 8.0, (y1 - y0) / 8.0
    H, W = g.shape
    jj, ii = np.meshgrid(np.arange(8), np.arange(8))
    S1 = S2 = Sc = 0.0
    acc = 0.0
    for fx, fy in ((m, m), (sx - m - p, m), (m, sy - m - p), (sx - m - p, sy - m - p)):
        X = np.clip(np.rint(x0 + jj * sx + fx).astype(int), 0, W - 1)
        Y = np.clip(np.rint(y0 + ii * sy + fy).astype(int), 0, H - 1)
        acc = acc + B[Y, X]
    v = acc / 4.0
    S1, S2, Sc = v.sum(), (v * v).sum(), (SIGN * v).sum()
    var = max(S2 - S1 * S1 / 64.0, 1e-3)
    corr = Sc / np.sqrt(64.0 * var)
    contrast = Sc / 32.0
    s = (sx + sy) / 2.0
    return float(corr * np.clip(contrast / 12.0, -1.0, 1.0) - 0.3 * abs(sx - sy) / s)


def refine_checker(gray, box, iters=8):
    g = np.asarray(gray, np.float32)
    cur = [float(v) for v in box]
    s = ((cur[2] - cur[0]) + (cur[3] - cur[1])) / 16.0
    stages = [ 
        (0.16, max(2, int(round(0.03 * s))), (6.0, 4.0, 2.0)),
        (0.10, 2, (3.0, 2.0, 1.0)),
        (0.06, 1, (1.5, 1.0, 0.5)),
    ]
    best = None
    for frac, m, steps in stages:
        p = max(3, int(round(frac * s)))
        B = cv2.boxFilter(g, cv2.CV_32F, (p, p), anchor=(0, 0), borderType=cv2.BORDER_REPLICATE)
        best = _fine_fit(g, B, p, m, cur)
        for st in steps:
            for _ in range(iters):
                improved = False
                for i in range(4):
                    for sg in (-1, 1):
                        cand = cur[:]
                        cand[i] += sg * st
                        sc = _fine_fit(g, B, p, m, cand)
                        if sc > best + 1e-4:
                            best, cur, improved = sc, cand, True
                if not improved:
                    break
    return tuple(cur), best


def fine_checker_fit(gray, box):
    g = np.asarray(gray, np.float32)
    x0, y0, x1, y1 = [float(v) for v in box]
    s = ((x1 - x0) + (y1 - y0)) / 16.0
    p = max(3, int(round(0.06 * s)))
    B = cv2.boxFilter(g, cv2.CV_32F, (p, p), anchor=(0, 0), borderType=cv2.BORDER_REPLICATE)
    return _fine_fit(g, B, p, 1, [x0, y0, x1, y1])
