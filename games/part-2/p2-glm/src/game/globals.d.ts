import { audio } from '../audio';

declare global
{
    interface Window
    {
        render_game_to_text?: () => string;
        advanceTime?: (ms: number) => void;
    }
}

export {};
