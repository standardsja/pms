import { PropsWithChildren } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { AppInitializer } from '../AppInitializer';

const BlankLayout = ({ children }: PropsWithChildren) => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    return (
        <>
            <AppInitializer />
            <div className={`${themeConfig.menu} ${themeConfig.layout} ${themeConfig.rtlClass} main-section antialiased relative font-nunito text-sm font-normal text-black dark:text-white-dark min-h-screen`}>
                {children}
            </div>
        </>
    );
};

export default BlankLayout;
