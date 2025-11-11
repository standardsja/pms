import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getUser } from '../utils/auth';

// Shared module keys across onboarding and guards
export type ModuleKey = 'pms' | 'ih' | 'committee';

interface ModuleState {
    selectedModule: ModuleKey | null;
    onboardingComplete: boolean;
}

// Build per-user storage keys so onboarding preferences don't leak across users on the same device
const buildKey = (base: string) => {
    try {
        const u = getUser();
        const suffix = (u && (u.id || u.email)) || 'anon';
        return `${base}:${suffix}`;
    } catch {
        return `${base}:anon`;
    }
};
const SELECTED_KEY = buildKey('selectedModule');
const ONBOARDING_KEY = buildKey('onboardingComplete');

const initialState: ModuleState = {
    selectedModule: (localStorage.getItem(SELECTED_KEY) as ModuleKey | null) || null,
    onboardingComplete: localStorage.getItem(ONBOARDING_KEY) === 'true',
};

const moduleSlice = createSlice({
    name: 'module',
    initialState,
    reducers: {
        setSelectedModule(state, action: PayloadAction<ModuleKey>) {
            state.selectedModule = action.payload;
            try {
                localStorage.setItem(buildKey('selectedModule'), action.payload);
            } catch {}
        },
        setOnboardingComplete(state, action: PayloadAction<boolean>) {
            state.onboardingComplete = action.payload;
            try {
                const key = buildKey('onboardingComplete');
                if (action.payload) localStorage.setItem(key, 'true');
                else localStorage.removeItem(key);
            } catch {}
        },
        clearModule(state) {
            state.selectedModule = null;
            state.onboardingComplete = false;
            try {
                localStorage.removeItem(buildKey('selectedModule'));
                localStorage.removeItem(buildKey('onboardingComplete'));
            } catch {}
        },
    },
});

export const { setSelectedModule, setOnboardingComplete, clearModule } = moduleSlice.actions;
export default moduleSlice.reducer;

// Selectors
export const selectSelectedModule = (state: any): ModuleKey | null => state.module?.selectedModule || null;
export const selectOnboardingComplete = (state: any): boolean => !!state.module?.onboardingComplete;