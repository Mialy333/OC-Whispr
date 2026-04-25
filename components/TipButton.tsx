'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy, useSendTransaction, useWallets, useConnectOrCreateWallet, useFundWallet } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { SA } from '@/components/ui';

const mono = { fontFamily: SA.mono } as const;

const DONATION_ADDRESS =
  (process.env.NEXT_PUBLIC_DONATION_ADDRESS as `0x${string}` | undefined) ?? '0x0000000000000000000000000000000000000000';

const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

// ── State machine ─────────────────────────────────────────────────────────────
// IDLE → NO_BALANCE | CHECKING → SUGGESTION → PENDING → SUCCESS
//                               ↓              ↓
//                          NO_BALANCE        ERROR
// ONRAMP_SUCCESS → SUGGESTION (via "TIP NOW →")
type State =
  | 'idle'
  | 'create_wallet'  // Farcaster user with no wallet yet
  | 'no_balance'
  | 'checking'       // "Checking wallet…" — max 5s
  | 'suggestion'     // AI suggestion card
  | 'pending'        // sending tx
  | 'success'        // tx confirmed
  | 'onramp_success' // ETH purchased via MoonPay/Coinbase
  | 'error'
  | 'wallet_conflict';

interface Suggestion { amount: number; message: string; }
interface Props { compact?: boolean; }

export default function TipButton({ compact = false }: Props) {
  const { ready, authenticated, login, linkWallet, createWallet } = usePrivy();
  const { sendTransaction }       = useSendTransaction();
  const { wallets }               = useWallets();
  const { connectOrCreateWallet } = useConnectOrCreateWallet();
  const { fundWallet }            = useFundWallet();

  const [state, setStateRaw]        = useState<State>('idle');
  const setState = (s: State | ((prev: State) => State)) => {
    setStateRaw((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      stateRef.current = next;
      return next;
    });
  };
  const [balanceEth, setBalanceEth] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [errMsg, setErrMsg]         = useState<string | null>(null);

  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef      = useRef<State>('idle');

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0];

  // Priority: embedded → external → null (no wallet at all, e.g. Farcaster-only auth)
  const getWalletAddress = (): string | null => {
    try {
      if (!ready) return null;
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (embedded?.address) return embedded.address;
      if (wallets[0]?.address) return wallets[0].address;
      return null;
    } catch (e) {
      return null;
    }
  };

  // ── Balance check (reads all wallets, returns highest) ────────────────────
  const checkBalance = async (currentWallets = wallets): Promise<number> => {
    if (currentWallets.length === 0) { setBalanceEth(0); return 0; }
    for (const w of currentWallets) {
      try {
        const b = await publicClient.getBalance({ address: w.address as `0x${string}` });
        const eth = parseFloat(formatEther(b));
        if (eth > 0) { setBalanceEth(eth); return eth; }
      } catch { continue; }
    }
    setBalanceEth(0);
    return 0;
  };

  // ── Fetch AI suggestion (sets state directly) ─────────────────────────────
  const fetchSuggestion = async (bal?: number): Promise<void> => {
    const balance = bal ?? balanceEth ?? 0;
    if (balance < 0.001) { setState('no_balance'); return; }
    try {
      const res  = await fetch(`/api/tip-suggest?balance=${balance.toFixed(6)}`);
      const data = await res.json() as { amount?: number; message?: string; error?: string };
      if (data.error === 'insufficient_balance') { setState('no_balance'); return; }
      setSuggestion({ amount: data.amount ?? 0.002, message: data.message ?? 'About the price of a coffee ☕' });
      setState('suggestion');
    } catch {
      setSuggestion({ amount: 0.002, message: 'About the price of a coffee ☕' });
      setState('suggestion');
    }
  };

  // ── Check balance then advance — with 5s timeout ──────────────────────────
  // addr: check a specific address directly (faster); falls back to all wallets
  const checkBalanceAndAdvance = async (addr?: string) => {
    setState('checking');
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => {
      setState((s) => s === 'checking' ? 'no_balance' : s);
    }, 5000);
    try {
      let bal: number;
      if (addr) {
        const raw = await publicClient.getBalance({ address: addr as `0x${string}` });
        bal = parseFloat(formatEther(raw));
        setBalanceEth(bal);
      } else {
        bal = await checkBalance(wallets);
      }
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (bal >= 0.001) {
        await fetchSuggestion(bal);
      } else {
        setState('no_balance');
      }
    } catch {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      setState('no_balance');
    }
  };

  // Silently pre-fetch suggestion on mount when wallet already funded
  useEffect(() => {
    if (wallets.length > 0) {
      checkBalance(wallets).then((bal) => {
        if (bal >= 0.001) {
          fetch(`/api/tip-suggest?balance=${bal.toFixed(6)}`)
            .then((r) => r.json())
            .then((d: { amount?: number; message?: string; error?: string }) => {
              if (!d.error) setSuggestion({ amount: d.amount ?? 0.002, message: d.message ?? 'About the price of a coffee ☕' });
            })
            .catch(() => {});
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new wallet appears, re-check balance if we're in a waiting state
  useEffect(() => {
    if (wallets.length === 0) return;
    if (stateRef.current === 'create_wallet' || stateRef.current === 'checking') {
      const addr = wallets.find((w) => w.walletClientType === 'privy')?.address ?? wallets[0]?.address;
      checkBalanceAndAdvance(addr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTipClick = async () => {
    if (!ready) return;

    if (!authenticated) {
      login();
      return;
    }

    let address = getWalletAddress();
    if (!address) {
      // Auto-attempt silent creation before showing manual prompt
      setState('checking');
      try {
        await createWallet();
        await new Promise(r => setTimeout(r, 2000));
        address = getWalletAddress();
      } catch (e) {
        console.log('[TipButton] createWallet:', e instanceof Error ? e.message : e);
        await new Promise(r => setTimeout(r, 1000));
        address = getWalletAddress();
      }
      if (!address) {
        setState('create_wallet');
        return;
      }
    }

    if (suggestion && balanceEth && balanceEth >= 0.001) { setState('suggestion'); return; }
    setState('checking');
    await checkBalanceAndAdvance(address);
  };

  const handleCreateWallet = async () => {
    try {
      setState('checking');
      await createWallet();
      await new Promise((r) => setTimeout(r, 2000));
      const address = getWalletAddress();
      if (address) {
        await checkBalanceAndAdvance(address);
      } else {
        setState('no_balance');
      }
    } catch (e) {
      console.error('createWallet error:', e);
      setState('no_balance');
    }
  };

  const handleAddEth = async () => {
    const addr = embeddedWallet?.address;
    try {
      if (addr) {
        await fundWallet(addr, { chain: base, asset: 'native-currency' });
      } else {
        connectOrCreateWallet();
      }
      setState('onramp_success');
    } catch {
      // Fallback: Coinbase onramp in new tab
      const dest = encodeURIComponent(JSON.stringify([{ address: addr ?? '', blockchains: ['base'] }]));
      window.open(`https://pay.coinbase.com/buy/select-asset?appId=alpha-whispr&destinationWallets=${dest}`, '_blank');
      setState('onramp_success'); // assume user completed onramp
    }
  };

  const handleConnectWallet = async () => {
    try {
      linkWallet();
      await new Promise((r) => setTimeout(r, 2500));
      const address = getWalletAddress();
      if (address) {
        setState('checking');
        await checkBalanceAndAdvance(address);
      } else {
        setState('no_balance');
      }
    } catch (e) {
      console.error('linkWallet error:', e);
      setState('no_balance');
    }
  };

  const confirmSend = async () => {
    if (!suggestion) return;
    setState('pending');
    try {
      const amountWei = BigInt(Math.round(suggestion.amount * 1e18));
      const { hash } = await sendTransaction({ to: DONATION_ADDRESS, value: amountWei, chainId: 8453 });
      setTxHash(hash);
      setState('success');
      fetch('/api/tip-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash, amount: suggestion.amount, address: embeddedWallet?.address }),
      }).catch(() => {});
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Transaction failed');
      setState('error');
    }
  };

  const reset = () => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    setState('idle');
    setErrMsg(null);
    setTxHash(null);
  };

  // ── Compact (header) variant ──────────────────────────────────────────────
  if (compact) {
    if (state === 'pending' || state === 'checking') {
      return <span style={{ ...mono, fontSize: 9, color: SA.terminalGreen }}>…</span>;
    }
    if (state === 'success') {
      return <span style={{ ...mono, fontSize: 9, color: SA.phosphorGlow }}>✓</span>;
    }

    const dropdownOpen = state === 'suggestion' || state === 'no_balance' || state === 'create_wallet' || state === 'onramp_success' || state === 'error' || state === 'wallet_conflict';

    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={state === 'suggestion' ? reset : handleTipClick}
          style={{
            ...mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
            color: state === 'suggestion' ? SA.amber : state === 'onramp_success' ? SA.phosphorGlow : 'var(--text-muted)',
            background: 'transparent',
            border: `1px solid ${state === 'suggestion' ? SA.amber : state === 'onramp_success' ? SA.phosphorGlow : 'var(--border)'}`,
            borderRadius: 4, padding: '2px 8px', height: 18,
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          {suggestion ? `☕ TIP ${suggestion.amount}Ξ` : '☕ TIP'}
        </button>

        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: 22, right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: 10,
            zIndex: 50, width: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}>
            {state === 'no_balance' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 8 }}>
                  You need ETH on Base to tip.
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <button onClick={handleAddEth} style={{
                    flex: 1, ...mono, fontSize: 9, fontWeight: 700, color: SA.phosphorGlow,
                    background: 'var(--bg-terminal, #0C1A0C)', border: `1px solid ${SA.phosphorGlow}`,
                    borderRadius: 6, padding: '5px 4px', cursor: 'pointer', lineHeight: 1.3,
                  }}>ADD ETH</button>
                  <button onClick={handleConnectWallet} style={{
                    flex: 1, ...mono, fontSize: 9, fontWeight: 700, color: SA.aqua,
                    background: 'transparent', border: `1px solid ${SA.aqua}`,
                    borderRadius: 6, padding: '5px 4px', cursor: 'pointer', lineHeight: 1.3,
                  }}>CONNECT</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>Card or Apple Pay</span>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>MetaMask & more</span>
                </div>
                <button onClick={reset} style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right' }}>
                  Close
                </button>
              </>
            )}
            {state === 'create_wallet' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.phosphorGlow, fontWeight: 700, marginBottom: 4 }}>
                  Create your Base wallet to tip 🔑
                </div>
                <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                  Takes 5 seconds. No seed phrase needed.
                </div>
                <button onClick={handleCreateWallet} style={{
                  width: '100%', ...mono, fontSize: 9, fontWeight: 700, color: SA.phosphorGlow,
                  background: 'var(--bg-terminal, #0C1A0C)', border: `1px solid ${SA.phosphorGlow}`,
                  borderRadius: 6, padding: '5px 0', cursor: 'pointer', marginBottom: 5,
                }}>CREATE WALLET</button>
                <button onClick={reset} style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                  Maybe later
                </button>
              </>
            )}
            {state === 'onramp_success' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.phosphorGlow, fontWeight: 700, marginBottom: 4 }}>
                  ✓ ETH added to your wallet
                </div>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                  Your Base wallet is ready.
                </div>
                <button
                  onClick={() => checkBalanceAndAdvance()}
                  style={{
                    width: '100%', ...mono, fontSize: 9, fontWeight: 700,
                    color: SA.phosphorGlow, background: 'var(--bg-terminal, #0C1A0C)',
                    border: `1px solid ${SA.phosphorGlow}`, borderRadius: 6, padding: '5px 0',
                    cursor: 'pointer',
                  }}
                >
                  TIP NOW →
                </button>
              </>
            )}
            {state === 'suggestion' && suggestion && (
              <>
                <div style={{
                  background: 'var(--bg-terminal, #0C1A0C)',
                  border: '1px solid rgba(0,255,65,0.2)',
                  borderRadius: 6, padding: '8px 10px', marginBottom: 10,
                }}>
                  {balanceEth !== null && (
                    <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Balance: {balanceEth.toFixed(4)} ETH
                    </div>
                  )}
                  <div style={{ ...mono, fontSize: 9, color: SA.phosphorGlow, lineHeight: 1.55 }}>
                    {suggestion.message}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: SA.terminalGreen, fontWeight: 700, marginTop: 4 }}>
                    Send {suggestion.amount} ETH?
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={confirmSend} style={{
                    flex: 1, ...mono, fontSize: 9, fontWeight: 700, color: SA.phosphorGlow,
                    background: 'var(--bg-terminal, #0C1A0C)', border: `1px solid ${SA.phosphorGlow}`,
                    borderRadius: 6, padding: '5px 0', cursor: 'pointer',
                  }}>YES, SEND</button>
                  <button onClick={reset} style={{
                    flex: 1, ...mono, fontSize: 9, color: 'var(--text-muted)',
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 0', cursor: 'pointer',
                  }}>LATER</button>
                </div>
              </>
            )}
            {state === 'error' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.rust, marginBottom: 6 }}>⚠ {errMsg ?? 'Transaction failed'}</div>
                <button onClick={reset} style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
              </>
            )}
            {state === 'wallet_conflict' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.amber, lineHeight: 1.55, marginBottom: 6 }}>
                  That address is linked to another account. Try a different wallet.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setState('no_balance'); handleConnectWallet(); }}
                    style={{ flex: 1, ...mono, fontSize: 9, color: SA.aqua, background: 'none', border: `1px solid ${SA.aqua}`, borderRadius: 5, padding: '4px 0', cursor: 'pointer' }}>
                    Try again
                  </button>
                  <button onClick={reset} style={{ flex: 1, ...mono, fontSize: 9, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 0', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full variant ──────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#050E05',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 72, color: SA.phosphorGlow, lineHeight: 1, marginBottom: 20 }}>✓</div>
        <div style={{ ...mono, fontSize: 22, color: SA.phosphorGlow, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>
          {suggestion ? `${suggestion.amount} ETH SENT` : 'SENT!'}
        </div>
        <div style={{ ...mono, fontSize: 12, color: SA.terminalGreen, lineHeight: 1.6, marginBottom: 28, maxWidth: 280 }}>
          Thank you for supporting Alpha Whispr
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank" rel="noreferrer"
            style={{
              ...mono, fontSize: 9, color: SA.aqua, textDecoration: 'none',
              wordBreak: 'break-all', marginBottom: 32, maxWidth: 300, display: 'block',
              border: '1px solid rgba(62,111,168,0.3)', borderRadius: 8, padding: '8px 12px',
            }}
          >
            View on BaseScan →
          </a>
        )}
        <button onClick={reset} style={{
          ...mono, fontSize: 11, fontWeight: 700, letterSpacing: 1,
          color: SA.phosphorGlow, background: 'transparent',
          border: `1.5px solid ${SA.phosphorGlow}`, borderRadius: 12,
          padding: '12px 32px', cursor: 'pointer',
        }}>
          ← BACK
        </button>
      </div>
    );
  }

  if (state === 'onramp_success') {
    return (
      <div style={{
        border: `1px solid ${SA.phosphorGlow}`, borderRadius: 12,
        padding: '16px', background: 'var(--bg-terminal, #0C1A0C)',
      }}>
        <div style={{ ...mono, fontSize: 12, color: SA.phosphorGlow, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
          ✓ ETH added to your wallet
        </div>
        <div style={{ ...mono, fontSize: 11, color: SA.terminalGreen, lineHeight: 1.55, marginBottom: 14 }}>
          Your Base wallet is ready.
        </div>
        <button
          onClick={() => checkBalanceAndAdvance()}
          style={{
            width: '100%', padding: '11px',
            background: 'transparent', border: `1.5px solid ${SA.phosphorGlow}`,
            borderRadius: 10, cursor: 'pointer',
            ...mono, fontSize: 11, fontWeight: 700,
            color: SA.phosphorGlow, letterSpacing: 0.5,
          }}
        >
          TIP NOW →
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ border: `1px solid ${SA.rust}`, borderRadius: 12, padding: '12px 14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 10, color: SA.rust, marginBottom: 8 }}>⚠ {errMsg ?? 'Transaction failed'}</div>
        <button onClick={reset} style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div style={{
        border: '1px solid rgba(0,255,65,0.2)', borderRadius: 12,
        padding: '12px 14px', background: 'var(--bg-terminal, #0C1A0C)', textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, color: SA.terminalGreen, letterSpacing: 1 }}>
          › Sending on Base…
        </div>
      </div>
    );
  }

  if (state === 'checking') {
    return (
      <div style={{
        border: '1px solid var(--border)', borderRadius: 12,
        padding: '12px 14px', textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
          Checking wallet…
        </div>
      </div>
    );
  }

  if (state === 'no_balance') {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
          You need ETH on Base to tip.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={handleAddEth} style={{
            flex: 1, padding: '11px 8px',
            background: 'var(--bg-terminal, #0C1A0C)', border: `1.5px solid ${SA.phosphorGlow}`,
            borderRadius: 10, cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: SA.phosphorGlow, marginBottom: 4 }}>ADD ETH</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4 }}>Buy with card or Apple Pay</div>
          </button>
          <button onClick={handleConnectWallet} style={{
            flex: 1, padding: '11px 8px',
            background: 'transparent', border: `1.5px solid ${SA.aqua}`,
            borderRadius: 10, cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: SA.aqua, marginBottom: 4 }}>CONNECT WALLET</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4 }}>MetaMask, Coinbase & more</div>
          </button>
        </div>
        <button onClick={reset} style={{
          width: '100%', ...mono, fontSize: 9, color: 'var(--text-muted)',
          background: 'none', border: 'none', cursor: 'pointer', paddingTop: 4,
        }}>Cancel</button>
      </div>
    );
  }

  if (state === 'wallet_conflict') {
    return (
      <div style={{ border: `1px solid ${SA.amber}`, borderRadius: 12, padding: '14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 10, color: SA.amber, fontWeight: 700, marginBottom: 6 }}>
          ⚠ Wallet already linked to another account
        </div>
        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
          That address is registered with a different Privy account. Try connecting a different wallet instead.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setState('no_balance'); handleConnectWallet(); }} style={{
            flex: 1, padding: '10px', border: `1.5px solid ${SA.aqua}`, borderRadius: 10,
            background: 'transparent', cursor: 'pointer',
            ...mono, fontSize: 10, fontWeight: 700, color: SA.aqua,
          }}>Try another wallet</button>
          <button onClick={reset} style={{
            flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 10,
            background: 'transparent', cursor: 'pointer',
            ...mono, fontSize: 10, color: 'var(--text-muted)',
          }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (state === 'create_wallet') {
    return (
      <div style={{
        border: '1px solid rgba(0,255,65,0.2)', borderRadius: 12,
        padding: '16px', background: 'var(--bg-terminal, #0C1A0C)',
      }}>
        <div style={{ ...mono, fontSize: 12, color: SA.phosphorGlow, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
          Create your Base wallet to tip 🔑
        </div>
        <div style={{ ...mono, fontSize: 11, color: SA.terminalGreen, lineHeight: 1.55, marginBottom: 16 }}>
          Takes 5 seconds. No seed phrase needed.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCreateWallet} style={{
            flex: 1, padding: '11px',
            background: 'transparent', border: `1.5px solid ${SA.phosphorGlow}`,
            borderRadius: 10, cursor: 'pointer',
            ...mono, fontSize: 11, fontWeight: 700, color: SA.phosphorGlow, letterSpacing: 0.5,
          }}>CREATE WALLET</button>
          <button onClick={reset} style={{
            flex: 1, padding: '11px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 10, cursor: 'pointer',
            ...mono, fontSize: 11, color: 'var(--text-muted)',
          }}>MAYBE LATER</button>
        </div>
      </div>
    );
  }

  if (state === 'suggestion' && suggestion) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--bg-terminal, #0C1A0C)',
          border: '1px solid rgba(0,255,65,0.2)', padding: '14px',
        }}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
            ALPHA WHISPR AGENT
          </div>
          {balanceEth !== null && (
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
              I see you have {balanceEth.toFixed(4)} ETH on Base.
            </div>
          )}
          <div style={{ ...mono, fontSize: 12, color: SA.phosphorGlow, lineHeight: 1.6, marginBottom: 8 }}>
            {suggestion.message}
          </div>
          <div style={{ ...mono, fontSize: 13, color: SA.terminalGreen, fontWeight: 700 }}>
            Send {suggestion.amount} ETH to support Alpha Whispr?
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <button onClick={confirmSend} style={{
            flex: 1, padding: '12px', background: 'var(--bg-terminal, #0C1A0C)',
            border: 'none', borderTop: `1px solid ${SA.phosphorGlow}`, cursor: 'pointer',
            ...mono, fontSize: 11, fontWeight: 700, color: SA.phosphorGlow, letterSpacing: 0.8,
          }}>YES, SEND</button>
          <button onClick={reset} style={{
            flex: 1, padding: '12px', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)',
            cursor: 'pointer', ...mono, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.8,
          }}>MAYBE LATER</button>
        </div>
      </div>
    );
  }

  // idle — main CTA
  return (
    <button onClick={handleTipClick} style={{
      width: '100%', padding: '11px',
      border: `1.5px solid ${SA.amber}`, background: 'transparent',
      borderRadius: 12, cursor: 'pointer',
      ...mono, fontSize: 11, fontWeight: 700, color: SA.amber, letterSpacing: 0.5,
    }}>
      ☕ Tip the builder on Base
    </button>
  );
}
