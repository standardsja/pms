import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Shared module keys across onboarding and guards
export type ModuleKey = 'pms' | 'ih' | 'committee';

interface ModuleState {
    selectedModule: ModuleKey | null;
    onboardingComplete: boolean;
}

const SELECTED_KEY = 'selectedModule';
const ONBOARDING_KEY = 'onboardingComplete';

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
                localStorage.setItem(SELECTED_KEY, action.payload);
            } catch {}
        },
        setOnboardingComplete(state, action: PayloadAction<boolean>) {
            state.onboardingComplete = action.payload;
            try {
                if (action.payload) localStorage.setItem(ONBOARDING_KEY, 'true');
                else localStorage.removeItem(ONBOARDING_KEY);
            } catch {}
        },
        clearModule(state) {
            state.selectedModule = null;
            state.onboardingComplete = false;
            try {
                localStorage.removeItem(SELECTED_KEY);
                localStorage.removeItem(ONBOARDING_KEY);
            } catch {}
        },
    },
});

export const { setSelectedModule, setOnboardingComplete, clearModule } = moduleSlice.actions;
export default moduleSlice.reducer;

// Selectors
export const selectSelectedModule = (state: any): ModuleKey | null => state.module?.selectedModule || null;
export const selectOnboardingComplete = (state: any): boolean => !!state.module?.onboardingComplete;