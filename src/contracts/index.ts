export { ADDRESSES, CHAIN, CHAIN_ID, USDC_DECIMALS, EXPLORER } from './addresses'
export { EscrowPlatformAbi } from './abis/EscrowPlatform'
export { DisputeDAOAbi } from './abis/DisputeDAO'
export { ProfileRegistryAbi } from './abis/ProfileRegistry'
export { ReputationNFTAbi } from './abis/ReputationNFT'
export { erc20Abi } from './abis/erc20'

export const JOB_STATUS = ['OPEN', 'ACTIVE', 'DISPUTED', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const
export type JobStatus = (typeof JOB_STATUS)[number]

export const MILESTONE_STATUS = ['PENDING', 'SUBMITTED', 'RELEASED', 'DISPUTED', 'CLIENT_WON', 'FREELANCER_WON'] as const
export type MilestoneStatus = (typeof MILESTONE_STATUS)[number]

export const JOB_CATEGORY = [
  'WEB_DEVELOPMENT',
  'MOBILE_DEVELOPMENT',
  'SMART_CONTRACT_DEVELOPMENT',
  'UI_UX_DESIGN',
  'GRAPHIC_DESIGN',
  'CONTENT_WRITING',
  'COPYWRITING',
  'DIGITAL_MARKETING',
  'DATA_SCIENCE',
  'VIDEO_EDITING',
  'AUDIO_PRODUCTION',
  'TRANSLATION',
  'VIRTUAL_ASSISTANT',
  'OTHERS',
] as const
export type JobCategory = (typeof JOB_CATEGORY)[number]

export const CATEGORY_LABEL: Record<JobCategory, string> = {
  WEB_DEVELOPMENT: 'Web Development',
  MOBILE_DEVELOPMENT: 'Mobile Development',
  SMART_CONTRACT_DEVELOPMENT: 'Smart Contract Development',
  UI_UX_DESIGN: 'UI/UX Design',
  GRAPHIC_DESIGN: 'Graphic Design',
  CONTENT_WRITING: 'Content Writing',
  COPYWRITING: 'Copywriting',
  DIGITAL_MARKETING: 'Digital Marketing',
  DATA_SCIENCE: 'Data Science',
  VIDEO_EDITING: 'Video Editing',
  AUDIO_PRODUCTION: 'Audio Production',
  TRANSLATION: 'Translation',
  VIRTUAL_ASSISTANT: 'Virtual Assistant',
  OTHERS: 'Others',
}
