/**
 * Script to verify infinite loop fixes are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for infinite loop patterns...\n');

const files = [
    'src/pages/Procurement/Auth/Onboarding.tsx',
    'src/components/Layouts/Header.tsx',
    'src/components/Layouts/Sidebar.tsx',
];

let hasIssues = false;

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📄 ${file}:`);
    
    // Check for useMemo on getUser()
    if (content.includes('const currentUser = useMemo(() => getUser()')) {
        console.log('  ✅ currentUser is memoized');
    } else if (content.includes('const currentUser = getUser()') && !content.includes('// OK: inside useEffect')) {
        console.log('  ⚠️  WARNING: currentUser is NOT memoized');
        hasIssues = true;
    }
    
    // Check for lazy initialization of getModuleLocks()
    if (content.includes('useState<ModuleLockState>(() => getModuleLocks())')) {
        console.log('  ✅ moduleLocks uses lazy initialization');
    } else if (content.includes('useState<ModuleLockState>(getModuleLocks())')) {
        console.log('  ⚠️  WARNING: moduleLocks does NOT use lazy initialization');
        hasIssues = true;
    }
    
    // Check for hasInitialized ref pattern in Onboarding
    if (file.includes('Onboarding')) {
        if (content.includes('const hasInitialized = useRef(false)')) {
            console.log('  ✅ hasInitialized ref pattern detected');
        } else {
            console.log('  ⚠️  WARNING: Missing hasInitialized ref pattern');
            hasIssues = true;
        }
        
        if (content.includes('JSON.stringify(moduleLocks)')) {
            console.log('  ✅ moduleLocks dependency uses JSON.stringify');
        } else {
            console.log('  ⚠️  WARNING: moduleLocks dependency might cause loops');
            hasIssues = true;
        }
    }
    
    console.log('');
});

if (hasIssues) {
    console.log('❌ ISSUES FOUND - Review warnings above\n');
    process.exit(1);
} else {
    console.log('✅ ALL CHECKS PASSED - No infinite loop patterns detected\n');
    process.exit(0);
}
