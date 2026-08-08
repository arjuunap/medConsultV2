export interface AppConfig {
  name: string;
  version: string;
  title: string;
  tagline: string;
  logoIcon: string;
  logoUrl?: string;
  icon: string;
  copyrightOwner: string;
  copyrightYear: number | string;
  location: string;
}

export const APP_CONFIG: AppConfig = {
  name: 'Tab Tab',
  version: 'V2',
  title: 'MedConsult V2 - Smart Telehealth & EMR Portal',
  tagline: 'Smart Telehealth & Clinical Portal',
  logoIcon: 'tabtab/tabtabLogo_600px.png',
  logoUrl: '',
  icon: 'tabtab/tabtabicon.png',
  copyrightOwner: 'MedConsult',
  copyrightYear: 2026,
  location: 'Riyadh, Saudi Arabia'
};
