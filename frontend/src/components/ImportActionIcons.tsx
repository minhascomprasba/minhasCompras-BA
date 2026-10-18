import { Image, QrCode } from '@phosphor-icons/react';

type IconProps = {
  className?: string;
};

export function QrCodeIcon({ className }: IconProps) {
  return <QrCode size={24} className={className} aria-hidden="true" />;
}

export function ImageUploadIcon({ className }: IconProps) {
  return <Image size={24} className={className} aria-hidden="true" />;
}
