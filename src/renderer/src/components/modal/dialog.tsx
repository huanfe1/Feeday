import NiceModal, { useModal } from '@ebay/nice-modal-react';
import type { ComponentProps } from 'react';

import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialog as AlertDialogParent,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AlertDialogType = {
    title: string;
    description: string;
    confirmVariant?: ComponentProps<typeof AlertDialogAction>['variant'];
};

const AlertDialog = NiceModal.create<AlertDialogType>(props => {
    const modal = useModal();

    const handleOpenChange = () => {
        modal.visible ? modal.hide() : modal.show();
    };

    return (
        <AlertDialogParent onOpenChange={handleOpenChange} open={modal.visible}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{props.title}</AlertDialogTitle>
                    <AlertDialogDescription>{props.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => modal.resolve()} variant={props.confirmVariant}>
                        确定
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialogParent>
    );
});

export const alertDialog = (options: AlertDialogType) => {
    return NiceModal.show(AlertDialog, options);
};
