import { PreviewService, PreviewInstance } from './preview.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Types for visual context
export interface VisualSnapshot {
  id: string;
  projectId: string;
  instanceId: string;
  screenshotBuffer?: Buffer;
  screenshotUrl?: string;
  uiElements: UIElement[];
  metadata: {
    timestamp: string;
    viewportSize: { width: number; height: number };
    url: string;
    captureMethod: string;
  };
}

export interface UIElement {
  id: string;
  selector: string;
  tagName: string;
  type: 'component' | 'element' | 'text' | 'interactive';
  coordinates: { x: number; y: number; width: number; height: number };
  text?: string;
  attributes: Record<string, any>;
  styles?: Record<string, any>;
  componentName?: string;
  parentComponent?: string;
}

export interface ElementCodeMapping {
  elementId: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  codeBlock: string;
  componentName?: string;
  confidence: number;
}

/**
 * Visual Context Capture Service
 * Extends PreviewService with optional visual analysis capabilities
 * Safe: Only adds functionality, doesn't modify existing preview behavior
 */
export class VisualContextCaptureService {
  private basePreviewService: PreviewService;
  private captureEnabled: boolean = false;
  
  constructor(basePreviewService: PreviewService) {
    this.basePreviewService = basePreviewService;
    
    // Enable capture if feature flag is set
    this.captureEnabled = process.env.ENABLE_VISUAL_CONTEXT_CAPTURE === 'true';
    
    if (this.captureEnabled) {
      console.log('📸 Visual Context Capture enabled');
    } else {
      console.log('📸 Visual Context Capture disabled (use ENABLE_VISUAL_CONTEXT_CAPTURE=true to enable)');
    }
  }

  /**
   * Capture visual context from a preview instance
   * Safe: Only adds functionality, doesn't affect existing preview
   */
  async captureVisualContext(
    instanceId: string,
    options: {
      includeScreenshot?: boolean;
      analyzeUIElements?: boolean;
      mapToCode?: boolean;
    } = {}
  ): Promise<VisualSnapshot | null> {
    if (!this.captureEnabled) {
      console.log('📸 Visual context capture is disabled');
      return null;
    }

    try {
      const instance = this.basePreviewService.getPreview(instanceId);
      if (!instance || instance.status !== 'running') {
        console.warn(`📸 Cannot capture context: instance ${instanceId} not running`);
        return null;
      }

      console.log(`📸 Capturing visual context for instance ${instanceId}`);

      const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize snapshot
      const snapshot: VisualSnapshot = {
        id: snapshotId,
        projectId: instance.projectId,
        instanceId,
        uiElements: [],
        metadata: {
          timestamp: new Date().toISOString(),
          viewportSize: { width: 1200, height: 800 }, // Default viewport
          url: instance.internalUrl || `http://localhost:${instance.port}`,
          captureMethod: 'puppeteer'
        }
      };

      // Capture screenshot if requested
      if (options.includeScreenshot) {
        snapshot.screenshotBuffer = await this.captureScreenshot(instance);
        console.log(`📸 Screenshot captured for ${instanceId}`);
      }

      // Analyze UI elements if requested
      if (options.analyzeUIElements) {
        snapshot.uiElements = await this.analyzeUIElements(instance);
        console.log(`📸 Found ${snapshot.uiElements.length} UI elements in ${instanceId}`);
      }

      return snapshot;

    } catch (error) {
      console.error(`❌ Error capturing visual context for ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Capture screenshot using Puppeteer
   * Safe: Optional feature, doesn't affect existing functionality
   */
  private async captureScreenshot(instance: PreviewInstance): Promise<Buffer | undefined> {
    try {
      // Only attempt screenshot if Puppeteer is available
      const puppeteer = await this.importPuppeteerSafely();
      if (!puppeteer) {
        console.warn('📸 Puppeteer not available, skipping screenshot');
        return undefined;
      }

      const url = instance.internalUrl || `http://localhost:${instance.port}`;
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });
      
      // Wait for the page to load
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false
      });
      
      await browser.close();
      
      return screenshotBuffer;

    } catch (error) {
      console.error('❌ Error capturing screenshot:', error);
      return undefined;
    }
  }

  /**
   * Analyze UI elements on the page
   * Safe: Optional feature, doesn't affect existing functionality
   */
  private async analyzeUIElements(instance: PreviewInstance): Promise<UIElement[]> {
    try {
      const puppeteer = await this.importPuppeteerSafely();
      if (!puppeteer) {
        console.warn('📸 Puppeteer not available, skipping UI analysis');
        return [];
      }

      const url = instance.internalUrl || `http://localhost:${instance.port}`;
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

      // Extract UI elements using page evaluation
      const elements = await page.evaluate(() => {
        const extractedElements: any[] = [];
        
        // Select interactive and meaningful elements
        const selectors = [
          'button', 'input', 'select', 'textarea', 'a',
          '[role="button"]', '[role="link"]', '[role="menuitem"]',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          '.component', '[data-component]', '[class*="Component"]',
          'nav', 'header', 'footer', 'main', 'section', 'article'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            
            // Only include visible elements
            if (rect.width > 0 && rect.height > 0) {
              const elementData = {
                id: `${selector.replace(/[\[\]:"]/g, '_')}_${index}`,
                selector: selector,
                tagName: el.tagName.toLowerCase(),
                type: el.tagName.toLowerCase(),
                coordinates: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height)
                },
                text: el.textContent?.trim().substring(0, 100) || '',
                attributes: Array.from(el.attributes || []).reduce((acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                }, {} as any)
              };

              extractedElements.push(elementData);
            }
          });
        });

        return extractedElements;
      });

      await browser.close();
      
      // Process and enhance elements
      return elements.map((el: any, index: number) => ({
        ...el,
        id: `element_${index}`,
        componentName: this.extractComponentName(el),
        parentComponent: this.extractParentComponent(el)
      }));

    } catch (error) {
      console.error('❌ Error analyzing UI elements:', error);
      return [];
    }
  }

  /**
   * Map UI elements to their source code locations
   * Safe: Optional feature for enhanced context
   */
  async mapElementsToCode(
    elements: UIElement[],
    projectPath: string
  ): Promise<ElementCodeMapping[]> {
    if (!this.captureEnabled) {
      return [];
    }

    try {
      const mappings: ElementCodeMapping[] = [];

      for (const element of elements) {
        const mapping = await this.findElementInCode(element, projectPath);
        if (mapping) {
          mappings.push(mapping);
        }
      }

      console.log(`🗺️ Mapped ${mappings.length}/${elements.length} elements to code`);
      return mappings;

    } catch (error) {
      console.error('❌ Error mapping elements to code:', error);
      return [];
    }
  }

  /**
   * Find element in source code files
   */
  private async findElementInCode(
    element: UIElement,
    projectPath: string
  ): Promise<ElementCodeMapping | null> {
    try {
      // Search strategies
      const searchTerms = [
        element.text,
        element.componentName,
        element.attributes.className,
        element.attributes.id,
        element.tagName
      ].filter(Boolean);

      // Search through common file types
      const fileExtensions = ['.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte'];
      
      for (const ext of fileExtensions) {
        const files = await this.findFiles(projectPath, ext);
        
        for (const file of files) {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (const term of searchTerms) {
            const lineIndex = lines.findIndex(line => 
              line.includes(term!) && this.looksLikeComponent(line)
            );

            if (lineIndex !== -1) {
              return {
                elementId: element.id,
                filePath: file.replace(projectPath, '').replace(/^\//, ''),
                lineNumber: lineIndex + 1,
                codeBlock: lines[lineIndex].trim(),
                componentName: element.componentName,
                confidence: this.calculateMappingConfidence(element, lines[lineIndex])
              };
            }
          }
        }
      }

      return null;

    } catch (error) {
      console.error(`❌ Error finding element ${element.id} in code:`, error);
      return null;
    }
  }

  /**
   * Helper methods
   */
  private async importPuppeteerSafely(): Promise<any> {
    try {
      return require('puppeteer');
    } catch (error) {
      console.warn('📸 Puppeteer not installed. Install with: npm install puppeteer');
      return null;
    }
  }

  private extractComponentName(element: any): string | undefined {
    // Try to extract React component names from class names or data attributes
    const className = element.attributes.className || '';
    const dataComponent = element.attributes['data-component'];
    
    if (dataComponent) return dataComponent;
    
    // Look for component-like class names
    const componentMatch = className.match(/([A-Z][a-zA-Z0-9]*)/);
    return componentMatch ? componentMatch[1] : undefined;
  }

  private extractParentComponent(element: any): string | undefined {
    // This would require DOM tree analysis, simplified for now
    return undefined;
  }

  private looksLikeComponent(line: string): boolean {
    return /(<[A-Z]|className|onClick|href)/.test(line);
  }

  private calculateMappingConfidence(element: UIElement, codeLine: string): number {
    let confidence = 0.1; // Base confidence
    
    if (element.text && codeLine.includes(element.text)) confidence += 0.4;
    if (element.componentName && codeLine.includes(element.componentName)) confidence += 0.3;
    if (element.attributes.className && codeLine.includes(element.attributes.className)) confidence += 0.2;
    
    return Math.min(1.0, confidence);
  }

  private async findFiles(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', '.next', 'dist'].includes(entry.name)) {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  /**
   * Enable/disable visual context capture
   */
  public setEnabled(enabled: boolean): void {
    this.captureEnabled = enabled;
    console.log(`📸 Visual context capture ${enabled ? 'enabled' : 'disabled'}`);
  }

  public isEnabled(): boolean {
    return this.captureEnabled;
  }
}

// Export factory function for safe integration
export function createVisualContextCaptureService(
  basePreviewService: PreviewService
): VisualContextCaptureService {
  return new VisualContextCaptureService(basePreviewService);
}