/** The id of a SegmentedTabs tab, which labels the panel while it is selected. */
export const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`

/** The id of the panel a SegmentedTabs controls. */
export const panelId = (idBase: string) => `${idBase}-panel`
