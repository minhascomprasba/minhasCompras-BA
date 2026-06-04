export type CameraDevice = {
  id: string;
  label: string;
};

const FRONT_CAMERA_RE =
  /front|user|selfie|facetime|frontal|wide frontal|true depth|truedepth/i;

const SECONDARY_LENS_RE =
  /ultra|ultrawide|wide angle|\bwide\b|0\.5|0,5|macro|depth|bokeh|auxiliary|\baux\b|fish|dual wide|periscop/i;

const TELEPHOTO_RE = /tele|telephoto|\bzoom\b|\b2x\b|\b3x\b|\b5x\b|\b10x\b/i;

const MAIN_CAMERA_RE =
  /\bmain\b|principal|standard|\b1x\b|back camera(?!\s*(ultra|wide|tele|macro|depth))|rear camera(?!\s*(ultra|wide|tele|macro))/i;

const BACK_CAMERA_RE = /back|rear|environment|traseir|facing back/i;

export function scoreCameraLabel(label: string): number {
  const l = label.toLowerCase().trim();
  if (!l) {
    return 0;
  }

  if (FRONT_CAMERA_RE.test(l)) {
    return -100;
  }

  let score = 0;

  if (MAIN_CAMERA_RE.test(label)) {
    score += 50;
  }

  if (BACK_CAMERA_RE.test(l)) {
    score += 10;
  }

  if (SECONDARY_LENS_RE.test(l)) {
    score -= 30;
  }

  if (TELEPHOTO_RE.test(l)) {
    score -= 20;
  }

  if (/camera2?\s*1\b|,1,.*back/.test(l)) {
    score += 6;
  }
  if (/camera2?\s*0\b|,0,.*back/.test(l)) {
    score += 1;
  }

  return score;
}

function isLikelyFrontCamera(label: string): boolean {
  return scoreCameraLabel(label) <= -50;
}

function isLikelyBackCamera(label: string): boolean {
  if (!label.trim()) {
    return true;
  }
  if (isLikelyFrontCamera(label)) {
    return false;
  }
  return BACK_CAMERA_RE.test(label) || scoreCameraLabel(label) >= 0;
}

/** Ordena câmeras: principal traseira primeiro (quando o rótulo permite identificar). */
export function rankBackCameras(cameras: CameraDevice[]): CameraDevice[] {
  if (cameras.length === 0) {
    return [];
  }

  const hasLabels = cameras.some((c) => c.label.trim().length > 0);

  if (!hasLabels) {
    if (cameras.length === 1) {
      return cameras;
    }
    return [
      cameras[cameras.length - 1],
      ...cameras.slice(1, -1).reverse(),
      cameras[0],
    ];
  }

  const backCameras = cameras.filter((c) => isLikelyBackCamera(c.label));
  const pool = backCameras.length > 0 ? backCameras : cameras.filter((c) => !isLikelyFrontCamera(c.label));

  const scored = pool
    .map((camera) => ({ camera, score: scoreCameraLabel(camera.label) }))
    .sort((a, b) => b.score - a.score);

  const ranked = scored.map(({ camera }) => camera);
  const rankedIds = new Set(ranked.map((c) => c.id));

  for (const camera of cameras) {
    if (!rankedIds.has(camera.id) && !isLikelyFrontCamera(camera.label)) {
      ranked.push(camera);
    }
  }

  return ranked.length > 0 ? ranked : cameras;
}

/** ID da câmera traseira principal (primeira da lista ordenada). */
export function pickDefaultCameraId(cameras: CameraDevice[]): string | null {
  const ranked = rankBackCameras(cameras);
  return ranked[0]?.id ?? cameras[0]?.id ?? null;
}
