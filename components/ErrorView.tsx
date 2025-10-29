import React from 'react';
import { RefreshIcon, ExclamationTriangleIcon } from './Icons';

interface ErrorViewProps {
    errorMessage: string;
    onRetry: () => void;
}

export function ErrorView({ errorMessage, onRetry }: ErrorViewProps): React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px] bg-red-900/20 border border-red-500/30 rounded-lg">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-red-300 mb-2">Analysis Failed</h2>
            <p className="text-center text-red-200 mb-6 max-w-md">
                {errorMessage.replace('Analysis Failed:', '').trim()}
            </p>
            <button
                onClick={onRetry}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-secondary hover:bg-brand-primary text-white font-semibold rounded-lg transition-colors"
            >
                <RefreshIcon className="w-5 h-5" />
                Try Again
            </button>
        </div>
    );
}
