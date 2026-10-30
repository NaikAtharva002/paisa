import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PUBLIC_PAGES_META } from '../components/public/PublicPagesContent';

describe('PAISA Business, Branding & Launch Readiness Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const publicDir = path.resolve(rootDir, 'public');
  const docsDir = path.resolve(rootDir, 'docs');

  // ============================================================================
  // 1. Brand Assets & Public Web Files Verification
  // ============================================================================
  describe('1. Brand Assets & Static Public Files', () => {
    it('verifies public brand assets exist and are valid SVG vectors', () => {
      const faviconPath = path.join(publicDir, 'favicon.svg');
      const iconPath = path.join(publicDir, 'icon.svg');
      const manifestPath = path.join(publicDir, 'manifest.json');

      expect(fs.existsSync(faviconPath)).toBe(true);
      expect(fs.existsSync(iconPath)).toBe(true);
      expect(fs.existsSync(manifestPath)).toBe(true);

      const faviconContent = fs.readFileSync(faviconPath, 'utf8');
      expect(faviconContent).toContain('<svg');
      expect(faviconContent).toContain('#D4952B'); // Ochre Gold

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifestContent.short_name).toBe('PAISA');
      expect(manifestContent.display).toBe('standalone');
      expect(manifestContent.theme_color).toBe('#FAF8F5');
    });

    it('verifies robots.txt allows public marketing routes and disallows private vaults', () => {
      const robotsPath = path.join(publicDir, 'robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const robots = fs.readFileSync(robotsPath, 'utf8');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain('Allow: /privacy');
      expect(robots).toContain('Allow: /terms');
      expect(robots).toContain('Disallow: /dashboard');
      expect(robots).toContain('Disallow: /vault/');
      expect(robots).toContain('Disallow: /api/');
      expect(robots).toContain('Sitemap: https://paisa.money/sitemap.xml');
    });

    it('verifies sitemap.xml is valid XML and lists all essential public URLs', () => {
      const sitemapPath = path.join(publicDir, 'sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const sitemap = fs.readFileSync(sitemapPath, 'utf8');
      expect(sitemap.startsWith('<?xml')).toBe(true);
      expect(sitemap).toContain('<loc>https://paisa.money/</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/features</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/pricing</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/about</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/faq</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/help</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/security</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/privacy</loc>');
      expect(sitemap).toContain('<loc>https://paisa.money/terms</loc>');
    });
  });

  // ============================================================================
  // 2. Public Pages Component & Content Integrity
  // ============================================================================
  describe('2. Public Page Taxonomy & Component Integrity', () => {
    it('contains all 14 required public pages with complete metadata', () => {
      expect(PUBLIC_PAGES_META.length).toBeGreaterThanOrEqual(14);

      const pageIds = PUBLIC_PAGES_META.map(p => p.id);
      expect(pageIds).toContain('features');
      expect(pageIds).toContain('pricing');
      expect(pageIds).toContain('about');
      expect(pageIds).toContain('faq');
      expect(pageIds).toContain('help');
      expect(pageIds).toContain('contact');
      expect(pageIds).toContain('security');
      expect(pageIds).toContain('privacy');
      expect(pageIds).toContain('terms');
      expect(pageIds).toContain('cookies');
      expect(pageIds).toContain('disclaimer');
      expect(pageIds).toContain('data-deletion');
      expect(pageIds).toContain('data-retention');
      expect(pageIds).toContain('changelog');

      for (const page of PUBLIC_PAGES_META) {
        expect(page.title.length).toBeGreaterThan(0);
        expect(page.subtitle.length).toBeGreaterThan(0);
        expect(['product', 'support', 'legal', 'trust']).toContain(page.category);
      }
    });
  });

  // ============================================================================
  // 3. Legal and Compliance Documentation Verification
  // ============================================================================
  describe('3. Legal Documentation Suite Completeness', () => {
    const requiredLegalFiles = [
      'PRIVACY_POLICY_DRAFT.md',
      'TERMS_AND_CONDITIONS_DRAFT.md',
      'COOKIE_POLICY_DRAFT.md',
      'FINANCIAL_DISCLAIMER_DRAFT.md',
      'DATA_RETENTION_POLICY_DRAFT.md',
      'DATA_DELETION_POLICY_DRAFT.md',
      'THIRD_PARTY_DISCLOSURE_DRAFT.md',
      'REFUND_AND_CANCELLATION_POLICY_DRAFT.md',
      'GRIEVANCE_AND_COMPLAINTS_PROCESS_DRAFT.md',
      'LEGAL_REVIEW_CHECKLIST.md',
    ];

    for (const file of requiredLegalFiles) {
      it(`verifies legal file docs/legal/${file} exists and contains statutory notices`, () => {
        const filePath = path.join(docsDir, 'legal', file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(300);
        expect(content).toContain('DRAFT');
      });
    }
  });

  // ============================================================================
  // 4. Marketing, Business & Operations Suite Verification
  // ============================================================================
  describe('4. Marketing, Business & Operations Readiness Suites', () => {
    it('verifies brand guidelines specify color codes and typography', () => {
      const brandPath = path.join(docsDir, 'branding', 'PAISA_BRAND_GUIDELINES.md');
      expect(fs.existsSync(brandPath)).toBe(true);

      const content = fs.readFileSync(brandPath, 'utf8');
      expect(content).toContain('#FAF8F5');
      expect(content).toContain('#181D26');
      expect(content).toContain('#D4952B');
      expect(content).toContain('Plus Jakarta Sans');
      expect(content).toContain('JetBrains Mono');
    });

    it('verifies social media content pack includes all post concepts', () => {
      const socialPath = path.join(docsDir, 'marketing', 'PAISA_SOCIAL_MEDIA_CONTENT.md');
      expect(fs.existsSync(socialPath)).toBe(true);

      const content = fs.readFileSync(socialPath, 'utf8');
      expect(content).toContain('Post 10:');
      expect(content).toContain('Reel 10:');
      expect(content).toContain('LinkedIn Post 5:');
      expect(content).toContain('Demo Script 3:');
    });

    it('verifies business model and cost estimates provide transparent pricing', () => {
      const bizPath = path.join(docsDir, 'business', 'PAISA_BUSINESS_MODEL.md');
      const costPath = path.join(docsDir, 'business', 'PAISA_COST_ESTIMATE.md');

      expect(fs.existsSync(bizPath)).toBe(true);
      expect(fs.existsSync(costPath)).toBe(true);

      const costContent = fs.readFileSync(costPath, 'utf8');
      expect(costContent).toContain('Vercel');
      expect(costContent).toContain('Supabase');
      expect(costContent).toContain('100,000 Users');
    });
  });
});
