/**
 * ProjectManager — Core logic for Git-style collaboration
 * 
 * Handles: project identity, working copies, revisions, proposals
 * Storage: localStorage (Phase 1-4), extensible to backend later
 */

// Generate UUID if crypto.randomUUID not available
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Anonymous user ID (persisted in localStorage)
export const getUserId = () => {
  let userId = localStorage.getItem('nal-user-id');
  if (!userId) {
    userId = `user-${generateId().slice(0, 8)}`;
    localStorage.setItem('nal-user-id', userId);
  }
  return userId;
};

export const getUserName = () => {
  return localStorage.getItem('nal-user-name') || 'Anonymous';
};

export const setUserName = (name) => {
  localStorage.setItem('nal-user-name', name);
};

// Storage keys
const STORAGE_KEYS = {
  PROJECTS_INDEX: 'nal-projects-index',
  WORKING_COPY_PREFIX: 'nal-workingcopy-',
  REVISION_PREFIX: 'nal-revision-',
  REVISIONS_INDEX: 'nal-revisions-index',
  PROPOSAL_PREFIX: 'nal-proposal-',
  PROPOSALS_INDEX: 'nal-proposals-index',
  USER_ID: 'nal-user-id',
  USER_NAME: 'nal-user-name',
};

// Atomic localStorage write (write to temp, verify, rename)
const atomicSetItem = (key, value) => {
  const tempKey = `${key}.tmp`;
  localStorage.setItem(tempKey, value);
  // Verify
  const verify = localStorage.getItem(tempKey);
  if (verify === value) {
    localStorage.setItem(key, value);
    localStorage.removeItem(tempKey);
    return true;
  }
  localStorage.removeItem(tempKey);
  return false;
};

const atomicRemoveItem = (key) => {
  localStorage.removeItem(key);
};

// Project Index
export const getProjectsIndex = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS_INDEX) || '[]');
  } catch {
    return [];
  }
};

export const saveProjectsIndex = (index) => {
  atomicSetItem(STORAGE_KEYS.PROJECTS_INDEX, JSON.stringify(index));
};

export const getOrCreateProject = (projectId, name) => {
  const index = getProjectsIndex();
  let project = index.find(p => p.projectId === projectId);
  
  if (!project) {
    project = {
      projectId,
      name: name || `Project ${projectId.slice(0, 8)}`,
      owner: getUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      defaultBranch: 'main',
    };
    index.push(project);
    saveProjectsIndex(index);
  }
  
  return project;
};

export const updateProject = (projectId, updates) => {
  const index = getProjectsIndex();
  const idx = index.findIndex(p => p.projectId === projectId);
  if (idx >= 0) {
    index[idx] = { ...index[idx], ...updates, updatedAt: Date.now() };
    saveProjectsIndex(index);
  }
};

// Working Copy
export const getWorkingCopy = (workingCopyId) => {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.WORKING_COPY_PREFIX}${workingCopyId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveWorkingCopy = (copy) => {
  copy.lastSaved = Date.now();
  atomicSetItem(`${STORAGE_KEYS.WORKING_COPY_PREFIX}${copy.workingCopyId}`, JSON.stringify(copy));
};

export const createWorkingCopy = (
  projectId,
  baseRevisionId,
  name,
  description,
  branchName,
  data
) => {
  const workingCopyId = generateId();
  const copy = {
    workingCopyId,
    projectId,
    userId: getUserId(),
    baseRevisionId,
    branchName,
    data,
    unsavedChanges: false,
    lastSaved: Date.now(),
    createdAt: Date.now(),
  };
  saveWorkingCopy(copy);
  return copy;
};

export const listWorkingCopies = (projectId) => {
  const copies = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEYS.WORKING_COPY_PREFIX)) {
      try {
        const copy = JSON.parse(localStorage.getItem(key) || '{}');
        if (copy.projectId === projectId) copies.push(copy);
      } catch {}
    }
  }
  return copies;
};

// Revisions
export const getRevision = (revisionId) => {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.REVISION_PREFIX}${revisionId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveRevision = (revision) => {
  atomicSetItem(`${STORAGE_KEYS.REVISION_PREFIX}${revision.revisionId}`, JSON.stringify(revision));
  
  // Update index
  const index = getRevisionsIndex();
  if (!index.includes(revision.revisionId)) {
    index.push(revision.revisionId);
    saveRevisionsIndex(index);
  }
};

export const getRevisionsIndex = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REVISIONS_INDEX) || '[]');
  } catch {
    return [];
  }
};

export const saveRevisionsIndex = (index) => {
  atomicSetItem(STORAGE_KEYS.REVISIONS_INDEX, JSON.stringify(index));
};

export const createRevision = (
  projectId,
  parentRevisionId,
  branchName,
  message,
  description,
  author,
  data
) => {
  const revisionId = generateId();
  
  // Compute metadata
  const deviceCount = data.network?.graph?.nodes?.length || 0;
  const linkCount = data.network?.graph?.edges?.length || 0;
  const stagesCompleted = [];
  const stages = { build: false, validate: false, sdn: false, nfv: false, orchestration: false, simulation: false };
  
  if (deviceCount > 0) stages.build = true;
  if (data.validationResult) stages.validate = true;
  if (data.sdnState?.controllerPlaced) stages.sdn = true;
  if (data.nfvState?.deployments?.length) stages.nfv = true;
  if (data.orchestrationState?.instances?.length) stages.orchestration = true;
  if (data.scores?.simulation) stages.simulation = true;
  
  Object.entries(stages).forEach(([key, val]) => { if (val) stagesCompleted.push(key); });
  
  const validationScore = data.validationResult?.scores?.overall || data.scores?.overall || 0;
  
  const revision = {
    revisionId,
    projectId,
    parentRevisionId,
    branchName,
    message,
    description,
    author,
    timestamp: Date.now(),
    data,
    metadata: {
      deviceCount,
      linkCount,
      stagesCompleted,
      validationScore,
      stages,
    },
  };
  
  saveRevision(revision);
  return revision;
};

export const listRevisions = (projectId, branchName) => {
  const index = getRevisionsIndex();
  const revisions = [];
  
  for (const revId of index) {
    const rev = getRevision(revId);
    if (rev && rev.projectId === projectId && (!branchName || rev.branchName === branchName)) {
      revisions.push(rev);
    }
  }
  
  // Sort by timestamp descending
  revisions.sort((a, b) => b.timestamp - a.timestamp);
  return revisions;
};

export const deleteRevision = (revisionId) => {
  atomicRemoveItem(`${STORAGE_KEYS.REVISION_PREFIX}${revisionId}`);
  
  // Update index
  const index = getRevisionsIndex();
  const filtered = index.filter(id => id !== revisionId);
  saveRevisionsIndex(filtered);
};

// Proposals (Phase 3 - stubbed for now)
export const getProposal = (proposalId) => {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.PROPOSAL_PREFIX}${proposalId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveProposal = (proposal) => {
  atomicSetItem(`${STORAGE_KEYS.PROPOSAL_PREFIX}${proposal.proposalId}`, JSON.stringify(proposal));
  
  const index = getProposalsIndex();
  if (!index.includes(proposal.proposalId)) {
    index.push(proposal.proposalId);
    saveProposalsIndex(index);
  }
};

export const getProposalsIndex = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPOSALS_INDEX) || '[]');
  } catch {
    return [];
  }
};

export const saveProposalsIndex = (index) => {
  atomicSetItem(STORAGE_KEYS.PROPOSALS_INDEX, JSON.stringify(index));
};

export const listProposals = (projectId) => {
  const index = getProposalsIndex();
  const proposals = [];
  
  for (const propId of index) {
    const prop = getProposal(propId);
    if (prop && prop.projectId === projectId) {
      proposals.push(prop);
    }
  }
  
  proposals.sort((a, b) => b.createdAt - a.createdAt);
  return proposals;
};

// Diff Engine (Phase 2 - stubbed for now)
export const computeDiff = (base, target) => {
  // Phase 2 will implement full semantic diff
  return {
    devices: { added: [], removed: [], modified: [] },
    links: { added: [], removed: [], modified: [] },
    ipAddresses: [],
    routing: [],
    sdn: [],
    nfv: [],
    orchestration: [],
    metadata: { summary: 'Diff not yet implemented', breakingChanges: false, changedEntityIds: [] },
  };
};

// Migration: Create working copy from current localStorage state

export const extractProjectData = (state) => ({
  network: state.network,
  scenario: {
    activeScenarioId: state.activeScenarioId,
    gameMode: state.gameMode,
    resourcePool: state.network?.remainingResources || {},
  },
  planningAnswers: state.planningAnswers,
  hintsUsed: state.hintsUsed,
  quizScore: state.quizScore,
  validationResult: state.validationResult,
  scores: state.scores,
  sdnState: state.sdnState,
  nfvState: state.nfvState,
  orchestrationState: state.orchestrationState,
});

export const migrateExistingProject = (projectId, gameStoreState) => {
  const existingRevisions = listRevisions(projectId);
  let baseRevisionId = 'initial';
  
  if (existingRevisions.length > 0) {
    baseRevisionId = existingRevisions[0].revisionId;
  }
  
  const workingCopyId = generateId();
  const copy = {
    workingCopyId,
    projectId,
    userId: getUserId(),
    baseRevisionId,
    branchName: 'main',
    data: extractProjectData(gameStoreState),
    unsavedChanges: false,
    lastSaved: Date.now(),
    createdAt: Date.now(),
  };
  
  saveWorkingCopy(copy);
  return copy;
};