import { useCallback, useRef, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export function useConfirm() {
    const [options, setOptions] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((opts) => {
        setOptions(typeof opts === 'string' ? { message: opts } : opts);
        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const settle = useCallback((result) => {
        setOptions(null);
        const resolve = resolverRef.current;
        resolverRef.current = null;
        if (resolve) resolve(result);
    }, []);

    const confirmModal = (
        <ConfirmModal
            open={!!options}
            title={options?.title}
            message={options?.message}
            confirmLabel={options?.confirmLabel}
            cancelLabel={options?.cancelLabel}
            variant={options?.variant}
            icon={options?.icon}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
        />
    );

    return { confirm, confirmModal };
}
