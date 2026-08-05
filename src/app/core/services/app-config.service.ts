import { Injectable, signal, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { AppConfig, APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private titleService = inject(Title);
  private document = inject(DOCUMENT);

  // Reactive signal storing current app configuration
  public readonly configSignal = signal<AppConfig>(APP_CONFIG);

  // Computed convenient properties
  public readonly name = computed(() => this.configSignal().name);
  public readonly version = computed(() => this.configSignal().version);
  public readonly tagline = computed(() => this.configSignal().tagline);
  public readonly logoIcon = computed(() => this.configSignal().logoIcon);
  public readonly logoUrl = computed(() => this.configSignal().logoUrl);
  public readonly icon = computed(() => this.configSignal().icon);
  public readonly copyrightOwner = computed(() => this.configSignal().copyrightOwner);
  public readonly copyrightYear = computed(() => this.configSignal().copyrightYear);
  public readonly location = computed(() => this.configSignal().location);

  // Helper method to detect if a string path is an image file URL
  private isImagePath(val?: string): boolean {
    if (!val) return false;
    const clean = val.trim().toLowerCase();
    return clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.svg') || clean.endsWith('.webp') || clean.endsWith('.ico') || clean.includes('/') || clean.startsWith('http') || clean.startsWith('data:');
  }

  // Computed signals to seamlessly handle both logoUrl and logoIcon images or emoji text
  public readonly hasLogoImage = computed(() => {
    return this.isImagePath(this.logoUrl()) || this.isImagePath(this.logoIcon());
  });

  public readonly logoSrc = computed(() => {
    if (this.isImagePath(this.logoUrl())) {
      return this.logoUrl()!;
    }
    if (this.isImagePath(this.logoIcon())) {
      return this.logoIcon();
    }
    return '';
  });

  constructor() {
    this.init();
  }

  /**
   * Initializes page title and favicon link based on global app config
   */
  public init(): void {
    const current = this.configSignal();
    this.updateTitle(current.title || `${current.name} ${current.version}`);
    this.updateFavicon(current.icon);
  }

  /**
   * Updates page document title
   */
  public updateTitle(title: string): void {
    if (title) {
      this.titleService.setTitle(title);
    }
  }

  /**
   * Dynamically sets or updates the favicon link tag in the document head
   */
  public updateFavicon(iconUrl: string): void {
    if (!iconUrl || !this.document) return;
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
    if (!link) {
      link = this.document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      this.document.head.appendChild(link);
    }
    link.href = iconUrl;
  }

  /**
   * Dynamically update global app configuration at runtime
   */
  public updateConfig(newConfig: Partial<AppConfig>): void {
    this.configSignal.update(current => {
      const updated = { ...current, ...newConfig };
      if (newConfig.title) {
        this.updateTitle(updated.title);
      }
      if (newConfig.icon) {
        this.updateFavicon(updated.icon);
      }
      return updated;
    });
  }

  /**
   * Direct getter for non-signal access
   */
  public get config(): AppConfig {
    return this.configSignal();
  }
}
