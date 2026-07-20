describe('family course flow', () => {
  let page

  beforeAll(async () => {
    page = await program.reLaunch('/pages/home/index')
    await page.waitFor(2000)
  })

  it('shows the course-first home page', async () => {
    const greeting = await page.$('.greeting')
    const text = await greeting.text()
    expect(text).toContain('英语学习')
  })

  it('navigates to calendar tab', async () => {
    const tabBar = await page.$('.uni-tabbar')
    const tabs = await tabBar.$$('.uni-tabbar__item')
    await tabs[1].tap()
    await page.waitFor(1000)
    const weekNav = await page.$('.week-nav')
    expect(weekNav).not.toBeNull()
  })

  it('navigates to growth tab', async () => {
    const tabBar = await page.$('.uni-tabbar')
    const tabs = await tabBar.$$('.uni-tabbar__item')
    await tabs[2].tap()
    await page.waitFor(1000)
    const pageTitle = await page.$('.page-title')
    const text = await pageTitle.text()
    expect(text).toContain('成长')
  })

  it('navigates to family tab', async () => {
    const tabBar = await page.$('.uni-tabbar')
    const tabs = await tabBar.$$('.uni-tabbar__item')
    await tabs[3].tap()
    await page.waitFor(1000)
    const pageTitle = await page.$('.page-title')
    const text = await pageTitle.text()
    expect(text).toContain('家庭')
  })

  it('returns to home and shows course hero card if course exists', async () => {
    const tabBar = await page.$('.uni-tabbar')
    const tabs = await tabBar.$$('.uni-tabbar__item')
    await tabs[0].tap()
    await page.waitFor(1000)
    const heroCard = await page.$('.hero-card')
    const emptyCard = await page.$('.empty-card')
    expect(heroCard !== null || emptyCard !== null).toBe(true)
  })

  it('opens course edit page from home', async () => {
    const addButton = await page.$('.add-button')
    if (addButton) {
      await addButton.tap()
      await page.waitFor(1000)
      const pageTitle = await page.$('.page-title')
      const text = await pageTitle.text()
      expect(text).toContain('课程')
    }
  })
})
