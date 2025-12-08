import { FC, SVGProps } from 'react';

const IconLockOpen: FC<SVGProps<SVGSVGElement>> = ({ ...props }) => {
    return (
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M6 11C6 9.89543 6.89543 9 8 9H14V7C14 4.23858 11.7614 2 9 2C6.23858 2 4 4.23858 4 7C4 7.55228 3.55228 8 3 8C2.44772 8 2 7.55228 2 7C2 3.13401 5.13401 0 9 0C12.866 0 16 3.13401 16 7V9C17.1046 9 18 9.89543 18 11V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V11ZM8 11V20H16V11H8Z"
                fill="currentColor"
            />
        </svg>
    );
};

export default IconLockOpen;
