import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

/**
 * Show success message with consistent styling
 */
export function showSuccess(title: string, text?: string) {
    return MySwal.fire({
        icon: 'success',
        title,
        text,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
    });
}

/**
 * Show error message with consistent styling
 */
export function showError(title: string, text?: string) {
    return MySwal.fire({
        icon: 'error',
        title,
        text,
        toast: true,
        position: 'top-end',
    });
}

/**
 * Show warning message with consistent styling
 */
export function showWarning(title: string, text?: string) {
    return MySwal.fire({
        icon: 'warning',
        title,
        text,
        toast: true,
        position: 'top-end',
    });
}

/**
 * Show info message with consistent styling
 */
export function showInfo(title: string, text?: string) {
    return MySwal.fire({
        icon: 'info',
        title,
        text,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
    });
}

/**
 * Show confirmation dialog
 */
export function showConfirm(title: string, text?: string) {
    return MySwal.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
    });
}
