/**
 * 回归测试：设置与词语表的状态合并、无障碍主题应用、恢复默认、词条去重与读音保存。
 */
import { expect, test } from '@playwright/test';

async function readSettings(page: import('@playwright/test').Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('app-017:settings') ?? '{}'));
}

test.describe('设置状态合并与应用', () => {
  test('改一项不会冲掉其它项；打印机参数可单独修改', async ({ page }) => {
    await page.goto('/settings');

    // 先改标调模式与勾选
    await page.getByLabel('标调模式').selectOption('none');
    await page.getByRole('checkbox', { name: /高对比度主题/ }).check();
    await expect(page.getByLabel('标调模式')).toHaveValue('none');

    // 再改字号（旧实现会把其它字段冲回默认）
    await page.getByLabel('字号').selectOption('150');
    await expect(page.getByLabel('标调模式')).toHaveValue('none');
    await expect(page.getByRole('checkbox', { name: /高对比度主题/ })).toBeChecked();

    // 再改打印机参数（旧实现完全无反应）
    const dotInput = page.getByRole('spinbutton', { name: /点径/ });
    await dotInput.fill('2.1');
    await dotInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    await expect(dotInput).toHaveValue('2.1');

    const saved = await readSettings(page);
    expect(saved.toneMode).toBe('none');
    expect(saved.highContrast).toBe(true);
    expect(saved.fontScale).toBe(150);
    expect(saved.printer.dotDiameterMm).toBeCloseTo(2.1, 5);
    // 没动的打印机字段保持默认
    expect(saved.printer.dotPitchMm).toBe(2.5);
  });

  test('高对比度勾选立即作用于 <html>，字号立即作用于根字号；刷新后保持', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('html')).not.toHaveClass(/high-contrast/);

    await page.getByRole('checkbox', { name: /高对比度主题/ }).check();
    await expect(page.locator('html')).toHaveClass(/high-contrast/);

    await page.getByLabel('字号').selectOption('200');
    const fontSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize);
    expect(Math.round(parseFloat(fontSize))).toBe(32); // 浏览器默认 16px × 200%

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/high-contrast/);
    await expect(page.getByRole('checkbox', { name: /高对比度主题/ })).toBeChecked();
  });

  test('恢复默认设置：高对比度、字号、规则、词语表全部回到默认', async ({ page }) => {
    await page.goto('/library');
    await page.getByPlaceholder('如：长城').fill('长城');
    await page.getByPlaceholder('如：chang2 cheng2').fill('chang2 cheng2');
    await page.getByRole('button', { name: '添加', exact: true }).click();
    await expect(page.getByText('chang2 cheng2', { exact: true })).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('checkbox', { name: /高对比度主题/ }).check();
    await page.getByLabel('字号').selectOption('200');
    await page.getByLabel('标调模式').selectOption('all');

    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '恢复默认设置' }).click();

    await expect(page.getByRole('checkbox', { name: /高对比度主题/ })).not.toBeChecked();
    await expect(page.getByLabel('字号')).toHaveValue('100');
    await expect(page.getByLabel('标调模式')).toHaveValue('national');
    await expect(page.locator('html')).not.toHaveClass(/high-contrast/);

    const saved = await readSettings(page);
    expect(saved.highContrast).toBe(false);
    expect(saved.fontScale).toBe(100);
    expect(saved.toneMode).toBe('national');
    expect(saved.dictEntries).toEqual([]);
    expect(saved.printer).toEqual({
      dotDiameterMm: 1.5,
      dotPitchMm: 2.5,
      cellPitchMm: 6.2,
      linePitchMm: 10,
      paperWidthMm: 210,
      paperHeightMm: 297,
    });

    await page.goto('/library');
    await expect(page.getByText('还没有词条。')).toBeVisible();
  });
});

test.describe('词语表', () => {
  test('读音按填写保存；同词重复添加只保留一条并更新读音；删除只删指定词', async ({ page }) => {
    await page.goto('/library');

    await page.getByPlaceholder('如：长城').fill('长大');
    await page.getByPlaceholder('如：chang2 cheng2').fill('chang2 da4');
    await page.getByRole('button', { name: '添加', exact: true }).click();
    await expect(page.getByText('chang2 da4')).toBeVisible();
    await expect(page.getByText('（用默认读音）')).toHaveCount(0);

    // 重复添加同一个词（旧实现会出现两条）
    await page.getByPlaceholder('如：长城').fill('长大');
    await page.getByPlaceholder('如：chang2 cheng2').fill('zhang3 da4');
    await page.getByRole('button', { name: '添加', exact: true }).click();

    const items = page.locator('.doc-item', { hasText: '长大' });
    await expect(items).toHaveCount(1);
    await expect(page.getByText('zhang3 da4')).toBeVisible();
    let saved = await readSettings(page);
    expect(saved.dictEntries).toEqual([{ word: '长大', readingOverride: 'zhang3 da4' }]);

    // 另加一条，删除时只删被点的词条
    await page.getByPlaceholder('如：长城').fill('银行');
    await page.getByPlaceholder('如：chang2 cheng2').fill('yin2 hang2');
    await page.getByRole('button', { name: '添加', exact: true }).click();
    await page.getByRole('button', { name: '删除词条 长大' }).click();
    await expect(page.getByText('长大')).toHaveCount(0);
    await expect(page.getByText('yin2 hang2')).toBeVisible();
    saved = await readSettings(page);
    expect(saved.dictEntries.map((e: { word: string }) => e.word)).toEqual(['银行']);
  });
});
