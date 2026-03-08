/**
 * MnemonicService provides utilities for generating and verifying 12-word recovery phrases.
 * Based on BIP-39 concepts.
 */

// A subset of English BIP-39 wordlist (usually 2048 words, here a smaller sample for demo/size)
const WORDLIST = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'adviser', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age',
    'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
    'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also',
    'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient',
    'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna',
    'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch',
    'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange',
    'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault',
    'asset', 'assist', 'assume', 'asthma', 'aston', 'atom', 'attack', 'attend', 'attitude', 'attract',
    'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid',
    'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon',
    'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely',
    'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because',
    'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench',
    'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind',
    'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak',
    'bless', 'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat',
    'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow',
    'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave',
    'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken'
    // ... we could add all 2048 words, but this is a representative sample
];

export class MnemonicService {
    /**
     * Generates a 12-word mnemonic phrase
     */
    static generateMnemonic(): string {
        const words: string[] = [];
        const randomValues = new Uint32Array(12);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < 12; i++) {
            const index = randomValues[i] % WORDLIST.length;
            words.push(WORDLIST[index]);
        }

        return words.join(' ');
    }

    /**
     * Hashes a mnemonic phrase for secure storage in the database
     */
    static async hashMnemonic(mnemonic: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(mnemonic.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verifies if a mnemonic phrase matches a stored hash
     */
    static async verify(mnemonic: string, hash: string): Promise<boolean> {
        const computedHash = await this.hashMnemonic(mnemonic);
        return computedHash === hash;
    }
}
