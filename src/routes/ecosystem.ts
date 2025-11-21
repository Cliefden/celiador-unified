import { Router } from 'express';
import { LivingEcosystemIntegration } from '../services/living-ecosystem-integration.js';

export function createEcosystemRoutes(ecosystemIntegration?: LivingEcosystemIntegration): Router {
  const router = Router();

  /**
   * Get ecosystem status
   * Safe: Read-only endpoint
   */
  router.get('/status', async (req, res) => {
    try {
      if (!ecosystemIntegration) {
        return res.json({
          available: false,
          message: 'Living Ecosystem not initialized'
        });
      }

      const status = ecosystemIntegration.getStatus();
      res.json({
        available: true,
        ...status
      });

    } catch (error) {
      console.error('❌ Error getting ecosystem status:', error);
      res.status(500).json({
        error: 'Failed to get ecosystem status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Process user intent with Living Ecosystem
   * Safe: Falls back to base AI if ecosystem is disabled
   */
  router.post('/intent', async (req, res) => {
    try {
      if (!ecosystemIntegration) {
        return res.status(503).json({
          error: 'Living Ecosystem not available'
        });
      }

      const {
        userIntent,
        projectContext,
        visualContext
      } = req.body;

      // Validate required fields
      if (!userIntent) {
        return res.status(400).json({
          error: 'userIntent is required'
        });
      }

      if (!projectContext?.projectId || !projectContext?.userId) {
        return res.status(400).json({
          error: 'projectContext with projectId and userId is required'
        });
      }

      console.log(`🎯 Processing intent via API: "${userIntent}"`);

      const result = await ecosystemIntegration.processUserIntent(
        userIntent,
        projectContext,
        visualContext
      );

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('❌ Error processing intent:', error);
      res.status(500).json({
        error: 'Failed to process intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Capture visual context for a preview instance
   * Safe: Only works if visual capture is enabled
   */
  router.post('/visual-context/:instanceId', async (req, res) => {
    try {
      if (!ecosystemIntegration) {
        return res.status(503).json({
          error: 'Living Ecosystem not available'
        });
      }

      const { instanceId } = req.params;
      const {
        includeScreenshot = false,
        analyzeUIElements = true,
        mapToCode = false
      } = req.body;

      console.log(`📸 Capturing visual context for instance: ${instanceId}`);

      const visualContext = await ecosystemIntegration.captureVisualContext(
        instanceId,
        {
          includeScreenshot,
          analyzeUIElements,
          mapToCode
        }
      );

      if (!visualContext) {
        return res.json({
          success: false,
          message: 'Visual context capture is disabled or failed'
        });
      }

      res.json({
        success: true,
        visualContext: {
          ...visualContext,
          // Don't send binary screenshot data in JSON response
          screenshotBuffer: visualContext.screenshotBuffer ? 'captured' : undefined
        }
      });

    } catch (error) {
      console.error('❌ Error capturing visual context:', error);
      res.status(500).json({
        error: 'Failed to capture visual context',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Update feature flags at runtime
   * Safe: Allows dynamic configuration
   */
  router.post('/config/features', async (req, res) => {
    try {
      if (!ecosystemIntegration) {
        return res.status(503).json({
          error: 'Living Ecosystem not available'
        });
      }

      const featureUpdates = req.body;
      
      // Validate feature flags
      const validFlags = [
        'enabled',
        'multiAgentSystem',
        'visualContextCapture',
        'contextualMemory',
        'intentExecution',
        'projectDNATracking'
      ];

      const invalidFlags = Object.keys(featureUpdates).filter(
        flag => !validFlags.includes(flag)
      );

      if (invalidFlags.length > 0) {
        return res.status(400).json({
          error: 'Invalid feature flags',
          invalidFlags,
          validFlags
        });
      }

      ecosystemIntegration.updateFeatureFlags(featureUpdates);
      
      res.json({
        success: true,
        message: 'Feature flags updated',
        currentFlags: ecosystemIntegration.getStatus().featureFlags
      });

    } catch (error) {
      console.error('❌ Error updating feature flags:', error);
      res.status(500).json({
        error: 'Failed to update feature flags',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Record a project DNA pattern
   * Safe: Only works if DNA tracking is enabled
   */
  router.post('/dna/:projectId', async (req, res) => {
    try {
      if (!ecosystemIntegration) {
        return res.status(503).json({
          error: 'Living Ecosystem not available'
        });
      }

      const { projectId } = req.params;
      const {
        userId,
        patternType,
        patternData,
        confidenceScore = 0.5
      } = req.body;

      // Validate required fields
      if (!userId || !patternType || !patternData) {
        return res.status(400).json({
          error: 'userId, patternType, and patternData are required'
        });
      }

      await ecosystemIntegration.recordProjectPattern(
        projectId,
        userId,
        patternType,
        patternData,
        confidenceScore
      );

      res.json({
        success: true,
        message: 'Project pattern recorded'
      });

    } catch (error) {
      console.error('❌ Error recording project pattern:', error);
      res.status(500).json({
        error: 'Failed to record project pattern',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}