'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useSendTransaction, useWallets, useConnectOrCreateWallet, useFundWallet } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { SA } from '@/components/ui';

const mono = { fontFamily: SA.mono } as const;

const DONATION_ADDRESS =
  (process.env.NEXT_PUBLIC_DONATION_ADDRESS as `0x${string}` | undefined) ?? '0x0000000000000000000000000000000000000000';

const publicClient = createPublicClient({ chain: base, transport: http() });

type State = 'idle' | 'loading' | 'suggestion' | 'pending' | 'success' | 'error' | 'no_funds' | 'wallet_conflict';

interface Suggestion { amount: number; message: string; }
interface Props { compact?: boolean; }

export default function TipButton({ compact = false }: Props) {
  const { linkWallet }            = usePrivy();
  const { sendTransaction }       = useSendTransaction();
  const { wallets }               = useWallets();
  const { connectOrCreateWallet } = useConnectOrCreateWallet();
  const { fundWallet }            = useFundWallet();

  const [state, setState]           = useState<State>('idle');
  const [balanceEth, setBalanceEth] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [errMsg, setErrMsg]         = useState<string | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0];
  const hasWallet = !!embeddedWallet;

  const checkBalance = (address: string) =>
    publicClient
      .getBalance({ address: address as `0x${string}` })
      .then((b) => setBalanceEth(parseFloat(formatEther(b))))
      .catch(() => setBalanceEth(null));

  // Fetch balance on mount and whenever a new wallet is linked
  useEffect(() => {
    if (!embeddedWallet?.address) return;
    checkBalance(embeddedWallet.address);
  }, [embeddedWallet?.address]);

  // After linkWallet() resolves the wallets array grows — re-check balance
  // and advance past no_funds if ETH is now available
  useEffect(() => {
    if (wallets.length === 0) return;
    const w = wallets.find((x) => x.walletClientType === 'privy') ?? wallets[0];
    if (!w?.address) return;
    publicClient
      .getBalance({ address: w.address as `0x${string}` })
      .then((b) => {
        const bal = parseFloat(formatEther(b));
        setBalanceEth(bal);
        if (bal >= 0.001 && state === 'no_funds') fetchSuggestion();
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length]);

  const fetchSuggestion = async () => {
    setState('loading');
    try {
      // Fetch balance fresh at click time for accuracy
      let bal = balanceEth;
      if (embeddedWallet?.address) {
        try {
          const b = await publicClient.getBalance({ address: embeddedWallet.address as `0x${string}` });
          bal = parseFloat(formatEther(b));
          setBalanceEth(bal);
        } catch { /* use cached */ }
      }

      if (bal !== null && bal < 0.001) {
        setState('no_funds');
        return;
      }

      const params = bal !== null ? `?balance=${bal.toFixed(6)}` : '';
      const res = await fetch(`/api/tip-suggest${params}`);
      const data = await res.json() as { amount?: number; message?: string; error?: string };

      if (data.error === 'insufficient_balance') { setState('no_funds'); return; }

      setSuggestion({
        amount:  data.amount  ?? 0.002,
        message: data.message ?? 'About the price of a coffee ☕',
      });
      setState('suggestion');
    } catch {
      // Fallback to default suggestion on any error
      setSuggestion({ amount: 0.002, message: 'About the price of a coffee ☕' });
      setState('suggestion');
    }
  };

  const handleClick = () => {
    if (!hasWallet) { setState('no_funds'); return; }
    fetchSuggestion();
  };

  const handleOnramp = () => {
    if (embeddedWallet?.address) {
      fundWallet(embeddedWallet.address, { chain: base, asset: 'native-currency' });
    } else {
      connectOrCreateWallet();
    }
  };

  const handleConnectExternal = async () => {
    try {
      await linkWallet();
      // useWallets() updates → wallets.length effect fires → balance re-checked
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('user already exists') || msg.toLowerCase().includes('already linked')) {
        setState('wallet_conflict');
      }
      // Other dismissals (user closed modal) are silently ignored
    }
  };

  const confirmSend = async () => {
    if (!suggestion) return;
    setState('pending');
    try {
      const amountWei = BigInt(Math.round(suggestion.amount * 1e18));
      const { hash } = await sendTransaction({
        to:    DONATION_ADDRESS,
        value: amountWei,
        chainId: 8453,
      });
      setTxHash(hash);
      setState('success');

      // Fire-and-forget tip confirmation tracking
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

  const reset = () => { setState('idle'); setErrMsg(null); setSuggestion(null); setTxHash(null); };

  // ── Compact (header) variant ──────────────────────────────────────────────
  if (compact) {
    if (state === 'pending') {
      return <span style={{ ...mono, fontSize: 9, color: SA.terminalGreen }}>…</span>;
    }
    if (state === 'success') {
      return <span style={{ ...mono, fontSize: 9, color: SA.phosphorGlow }}>✓</span>;
    }

    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={state === 'suggestion' ? reset : handleClick}
          disabled={state === 'loading'}
          style={{
            ...mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
            color: state === 'suggestion' ? SA.amber : 'var(--text-muted)',
            background: 'transparent',
            border: `1px solid ${state === 'suggestion' ? SA.amber : 'var(--border)'}`,
            borderRadius: 4, padding: '2px 8px', height: 18,
            cursor: state === 'loading' ? 'wait' : 'pointer', lineHeight: 1,
            opacity: state === 'loading' ? 0.5 : 1,
          }}
        >
          {state === 'loading' ? '…' : '☕ TIP'}
        </button>

        {(state === 'suggestion' || state === 'no_funds' || state === 'error' || state === 'wallet_conflict') && (
          <div style={{
            position: 'absolute', top: 22, right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: 10,
            zIndex: 50, width: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}>
            {state === 'no_funds' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 8 }}>
                  You need ETH on Base to tip.
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <button
                    onClick={handleOnramp}
                    style={{
                      flex: 1, ...mono, fontSize: 9, fontWeight: 700,
                      color: SA.phosphorGlow,
                      background: 'var(--bg-terminal, #0C1A0C)',
                      border: `1px solid ${SA.phosphorGlow}`,
                      borderRadius: 6, padding: '5px 4px', cursor: 'pointer',
                      lineHeight: 1.3, textAlign: 'center',
                    }}
                  >
                    ADD ETH
                  </button>
                  <button
                    onClick={handleConnectExternal}
                    style={{
                      flex: 1, ...mono, fontSize: 9, fontWeight: 700,
                      color: SA.aqua,
                      background: 'transparent',
                      border: `1px solid ${SA.aqua}`,
                      borderRadius: 6, padding: '5px 4px', cursor: 'pointer',
                      lineHeight: 1.3, textAlign: 'center',
                    }}
                  >
                    CONNECT
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', flex: 1, textAlign: 'center', lineHeight: 1.4 }}>Card or Apple Pay</span>
                  <span style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', flex: 1, textAlign: 'center', lineHeight: 1.4 }}>MetaMask & more</span>
                </div>
                <button onClick={reset} style={{ ...mono, fontSize: 8, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, width: '100%', textAlign: 'right' }}>
                  Close
                </button>
              </>
            )}
            {state === 'error' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.rust, marginBottom: 6 }}>⚠ {errMsg}</div>
                <button onClick={reset} style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
              </>
            )}
            {state === 'wallet_conflict' && (
              <>
                <div style={{ ...mono, fontSize: 9, color: SA.amber, lineHeight: 1.55, marginBottom: 6 }}>
                  That address is linked to another account. Try a different wallet.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setState('no_funds'); handleConnectExternal(); }}
                    style={{ flex: 1, ...mono, fontSize: 9, color: SA.aqua, background: 'none', border: `1px solid ${SA.aqua}`, borderRadius: 5, padding: '4px 0', cursor: 'pointer' }}
                  >
                    Try again
                  </button>
                  <button onClick={reset} style={{ flex: 1, ...mono, fontSize: 9, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 0', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
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
                  <button
                    onClick={confirmSend}
                    style={{
                      flex: 1, ...mono, fontSize: 9, fontWeight: 700,
                      color: SA.phosphorGlow,
                      background: 'var(--bg-terminal, #0C1A0C)',
                      border: `1px solid ${SA.phosphorGlow}`,
                      borderRadius: 6, padding: '5px 0', cursor: 'pointer',
                    }}
                  >
                    YES, SEND
                  </button>
                  <button
                    onClick={reset}
                    style={{
                      flex: 1, ...mono, fontSize: 9,
                      color: 'var(--text-muted)',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 6, padding: '5px 0', cursor: 'pointer',
                    }}
                  >
                    LATER
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
        border: `1px solid ${SA.phosphorGlow}`, borderRadius: 12,
        padding: '14px', background: 'var(--bg-terminal, #0C1A0C)',
        textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 12, color: SA.phosphorGlow, fontWeight: 700, marginBottom: 6 }}>
          ✓ Sent! Thank you 🎉
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank" rel="noreferrer"
            style={{ ...mono, fontSize: 9, color: SA.aqua, textDecoration: 'none', wordBreak: 'break-all' }}
          >
            View on BaseScan →
          </a>
        )}
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
        border: `1px solid rgba(0,255,65,0.2)`, borderRadius: 12,
        padding: '12px 14px', background: 'var(--bg-terminal, #0C1A0C)',
        textAlign: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, color: SA.terminalGreen, letterSpacing: 1 }}>
          › Sending on Base…
        </div>
      </div>
    );
  }

  if (state === 'no_funds') {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-secondary)' }}>
        <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
          You need ETH on Base to tip.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={handleOnramp}
            style={{
              flex: 1, padding: '11px 8px',
              background: 'var(--bg-terminal, #0C1A0C)',
              border: `1.5px solid ${SA.phosphorGlow}`,
              borderRadius: 10, cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: SA.phosphorGlow, marginBottom: 4 }}>
              ADD ETH
            </div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Buy with card or Apple Pay
            </div>
          </button>
          <button
            onClick={handleConnectExternal}
            style={{
              flex: 1, padding: '11px 8px',
              background: 'transparent',
              border: `1.5px solid ${SA.aqua}`,
              borderRadius: 10, cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: SA.aqua, marginBottom: 4 }}>
              CONNECT WALLET
            </div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              MetaMask, Coinbase & more
            </div>
          </button>
        </div>
        <button
          onClick={reset}
          style={{
            width: '100%', ...mono, fontSize: 9, color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', paddingTop: 4,
          }}
        >
          Cancel
        </button>
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
          <button
            onClick={() => { setState('no_funds'); handleConnectExternal(); }}
            style={{
              flex: 1, padding: '10px',
              border: `1.5px solid ${SA.aqua}`, borderRadius: 10,
              background: 'transparent', cursor: 'pointer',
              ...mono, fontSize: 10, fontWeight: 700, color: SA.aqua,
            }}
          >
            Try another wallet
          </button>
          <button
            onClick={reset}
            style={{
              flex: 1, padding: '10px',
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'transparent', cursor: 'pointer',
              ...mono, fontSize: 10, color: 'var(--text-muted)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === 'suggestion' && suggestion) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--bg-terminal, #0C1A0C)',
          border: '1px solid rgba(0,255,65,0.2)',
          padding: '14px',
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
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={confirmSend}
            style={{
              flex: 1, padding: '12px',
              background: 'var(--bg-terminal, #0C1A0C)',
              border: 'none', borderTop: `1px solid ${SA.phosphorGlow}`,
              cursor: 'pointer',
              ...mono, fontSize: 11, fontWeight: 700,
              color: SA.phosphorGlow, letterSpacing: 0.8,
            }}
          >
            YES, SEND
          </button>
          <button
            onClick={reset}
            style={{
              flex: 1, padding: '12px',
              background: 'transparent',
              border: 'none', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
              ...mono, fontSize: 11,
              color: 'var(--text-muted)', letterSpacing: 0.8,
            }}
          >
            MAYBE LATER
          </button>
        </div>
      </div>
    );
  }

  // idle
  if (state === 'loading') {
    return (
      <div style={{
        width: '100%', padding: '11px',
        border: '1px solid var(--border)', borderRadius: 12,
        ...mono, fontSize: 11, color: 'var(--text-muted)',
        textAlign: 'center', letterSpacing: 0.5,
      }}>
        Agent checking your wallet…
      </div>
    );
  }

  // No wallet yet — show the two-option panel directly
  if (!hasWallet) return null; // unreachable: handleClick sets no_funds first

  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%', padding: '11px',
        border: `1.5px solid ${SA.amber}`,
        background: 'transparent', borderRadius: 12, cursor: 'pointer',
        ...mono, fontSize: 11, fontWeight: 700,
        color: SA.amber, letterSpacing: 0.5,
      }}
    >
      ☕ Tip the builder on Base
    </button>
  );
}
