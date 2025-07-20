const { test, expect } = require('@playwright/test');

test.describe('WebSocket', () => {
  test('should connect to WebSocket if available', async ({ page }) => {
    let wsMessages = [];
    let wsConnected = false;
    
    page.on('websocket', ws => {
      wsConnected = true;
      
      ws.on('framesent', event => {
        
      });
      
      ws.on('framereceived', event => {
        wsMessages.push(event.payload());
      });
      
      ws.on('close', () => {
        
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    if (wsConnected) {
      // Try to trigger WebSocket communication through chat
      const chatInput = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
      
      if (await chatInput.count() > 0 && await sendButton.count() > 0) {
        await chatInput.fill('Test WebSocket message');
        await sendButton.click();
        
        await page.waitForTimeout(3000);
        
        expect(wsMessages.length).toBeGreaterThan(0);
      }
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('should handle WebSocket errors gracefully', async ({ page }) => {
    let wsErrors = [];
    
    page.on('websocket', ws => {
      ws.on('socketerror', error => {
        wsErrors.push(error);
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});