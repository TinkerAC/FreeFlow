import React from 'react';
import { Contract, formatEther, JsonRpcProvider, type Provider } from 'ethers';
import {
  listWeb25RoyaltyWorkspace,
  recordWeb25RoyaltyClaim,
  type CreatorReleaseRecord,
  type Web25RoyaltyClaimRecord,
  type Web25RoyaltyWorkspace,
} from '@renderer/core/web25/client';
import { getProfileSigner } from '@renderer/core/web3/profileSigner';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import { DEFAULT_SEPOLIA_CONTRACTS, ROYALTY_SPLITTER_ABI } from '@src/shared/web3/freeflowContracts';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import styles from '../../MusicWorkshop.module.css';

type SplitterPayee = {
  address: string;
  label: string;
  shares: bigint;
  releasedWei: bigint;
};

type RoyaltyRow = {
  release: CreatorReleaseRecord;
  splitterAddress: string;
  chainId: number;
  payees: SplitterPayee[];
  totalShares: bigint;
  totalReleasedWei: bigint;
  contractBalanceWei: bigint;
  totalReceivedWei: bigint;
  accountShares: bigint;
  accountReleasedWei: bigint;
  accountReleasableWei: bigint;
  accountSharePercent: number;
  error: string | null;
};

type RoyaltyEarningsPanelProps = {
  controller: MusicWorkshopController;
};

function compactAddress(value?: string | null) {
  if (!value) return '-';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatEth(value: bigint) {
  const fixed = Number(formatEther(value));
  if (!Number.isFinite(fixed) || fixed === 0) return '0';
  if (fixed < 0.0001) return '< 0.0001';
  return fixed.toLocaleString('zh-CN', {
    maximumFractionDigits: fixed >= 1 ? 4 : 6,
  });
}

function releaseLabel(release: CreatorReleaseRecord) {
  return release.title || release.slug || `Token #${release.tokenId || release.id.slice(-6)}`;
}

function splitLabelFor(release: CreatorReleaseRecord, address: string) {
  const split = release.revenueSplits.find((item) => item.address.toLowerCase() === address.toLowerCase());
  return split?.label || compactAddress(address);
}

function claimTotalForRelease(claims: Web25RoyaltyClaimRecord[], releaseId: string) {
  return claims
    .filter((claim) => claim.releaseId === releaseId)
    .reduce((total, claim) => total + BigInt(claim.amountWei), BigInt(0));
}

function extractPaymentReleasedAmount(logs: readonly unknown[], splitter: Contract, accountAddress: string) {
  for (const log of logs) {
    try {
      const parsed = splitter.interface.parseLog(log as Parameters<typeof splitter.interface.parseLog>[0]);
      if (!parsed || parsed.name !== 'PaymentReleased') continue;
      const to = parsed.args[0];
      const amount = parsed.args[1];
      if (typeof to === 'string' && to.toLowerCase() === accountAddress.toLowerCase() && typeof amount === 'bigint') {
        return amount;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function loadSplitterRow(provider: Provider, release: CreatorReleaseRecord, accountAddress: string): Promise<RoyaltyRow> {
  const splitterAddress = release.splitterAddress || '';
  const chainId = release.chainId ?? DEFAULT_SEPOLIA_CONTRACTS.chainId;
  const emptyRow: RoyaltyRow = {
    release,
    splitterAddress,
    chainId,
    payees: [],
    totalShares: BigInt(0),
    totalReleasedWei: BigInt(0),
    contractBalanceWei: BigInt(0),
    totalReceivedWei: BigInt(0),
    accountShares: BigInt(0),
    accountReleasedWei: BigInt(0),
    accountReleasableWei: BigInt(0),
    accountSharePercent: 0,
    error: null,
  };

  if (!splitterAddress) {
    return { ...emptyRow, error: '缺少分账合约地址' };
  }

  try {
    const splitter = new Contract(splitterAddress, ROYALTY_SPLITTER_ABI, provider);
    const [payeeCountRaw, totalShares, totalReleasedWei, contractBalanceWei, accountShares, accountReleasedWei] = await Promise.all([
      splitter.payeeCount(),
      splitter.totalShares(),
      splitter.totalReleased(),
      provider.getBalance(splitterAddress),
      splitter.shares(accountAddress),
      splitter.released(accountAddress),
    ]) as [bigint, bigint, bigint, bigint, bigint, bigint];

    const payeeCount = Number(payeeCountRaw);
    const payees = await Promise.all(Array.from({ length: payeeCount }, async (_item, index) => {
      const address = await splitter.payee(index) as string;
      const [shares, releasedWei] = await Promise.all([
        splitter.shares(address),
        splitter.released(address),
      ]) as [bigint, bigint];
      return {
        address,
        label: splitLabelFor(release, address),
        shares,
        releasedWei,
      };
    }));

    const accountReleasableWei = accountShares > BigInt(0)
      ? await splitter.releasable(accountAddress) as bigint
      : BigInt(0);
    const totalReceivedWei = contractBalanceWei + totalReleasedWei;
    const accountSharePercent = totalShares > BigInt(0)
      ? Number((accountShares * BigInt(10000)) / totalShares) / 100
      : 0;

    return {
      ...emptyRow,
      payees,
      totalShares,
      totalReleasedWei,
      contractBalanceWei,
      totalReceivedWei,
      accountShares,
      accountReleasedWei,
      accountReleasableWei,
      accountSharePercent,
    };
  } catch (error) {
    return {
      ...emptyRow,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default function RoyaltyEarningsPanel({ controller }: RoyaltyEarningsPanelProps) {
  const { walletProvider } = useWalletRuntimeState();
  const accountAddress = controller.web25Session?.address ?? controller.address ?? '';
  const [workspace, setWorkspace] = React.useState<Web25RoyaltyWorkspace | null>(null);
  const [rows, setRows] = React.useState<RoyaltyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [claimingReleaseId, setClaimingReleaseId] = React.useState<string | null>(null);
  const [statusText, setStatusText] = React.useState('');

  const loadRoyalties = React.useCallback(async () => {
    if (!controller.web25Session || !accountAddress) {
      setWorkspace(null);
      setRows([]);
      return;
    }

    setLoading(true);
    setStatusText('');
    try {
      const payload = await listWeb25RoyaltyWorkspace(controller.web25BackendBaseUrl, {
        chainId: controller.effectiveWeb3Settings.chainId,
      });
      setWorkspace(payload);

      const provider = new JsonRpcProvider(DEFAULT_SEPOLIA_CONTRACTS.rpcUrl);
      const nextRows = await Promise.all(
        payload.releases.map((release) => loadSplitterRow(provider, release, payload.accountAddress)),
      );
      setRows(nextRows);
    } catch (error) {
      setStatusText(`收益数据读取失败：${error instanceof Error ? error.message : String(error)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    accountAddress,
    controller.effectiveWeb3Settings.chainId,
    controller.web25BackendBaseUrl,
    controller.web25Session,
  ]);

  React.useEffect(() => {
    void loadRoyalties();
  }, [loadRoyalties]);

  const totals = React.useMemo(() => {
    const pendingWei = rows.reduce((total, row) => total + row.accountReleasableWei, BigInt(0));
    const releasedWei = rows.reduce((total, row) => total + row.accountReleasedWei, BigInt(0));
    const receivedWei = rows.reduce((total, row) => total + row.totalReceivedWei, BigInt(0));
    const averageShare = rows.length
      ? rows.reduce((total, row) => total + row.accountSharePercent, 0) / rows.length
      : 0;

    return {
      pendingWei,
      releasedWei,
      receivedWei,
      averageShare,
    };
  }, [rows]);

  const claimRows = workspace?.claims ?? [];
  const maxPending = rows.reduce(
    (max, row) => row.accountReleasableWei > max ? row.accountReleasableWei : max,
    BigInt(0),
  );

  const handleClaim = React.useCallback(async (row: RoyaltyRow) => {
    if (!walletProvider || !accountAddress) {
      setStatusText('请先连接与当前 Profile 一致的钱包');
      return;
    }
    if (row.accountReleasableWei <= BigInt(0)) {
      setStatusText('当前作品暂无可领取收益');
      return;
    }

    setClaimingReleaseId(row.release.id);
    setStatusText('');
    try {
      const { signer, signerAddress } = await getProfileSigner(walletProvider, accountAddress);
      const splitter = new Contract(row.splitterAddress, ROYALTY_SPLITTER_ABI, signer);
      const tx = await splitter.release(signerAddress);
      const receipt = await tx.wait();
      const amountWei = receipt
        ? extractPaymentReleasedAmount(receipt.logs, splitter, signerAddress) ?? row.accountReleasableWei
        : row.accountReleasableWei;

      await recordWeb25RoyaltyClaim(controller.web25BackendBaseUrl, {
        releaseId: row.release.id,
        accountAddress: signerAddress,
        splitterAddress: row.splitterAddress,
        chainId: row.chainId,
        txHash: tx.hash,
        amountWei: amountWei.toString(),
        claimedAt: new Date().toISOString(),
      });

      setStatusText(`已领取 ${formatEth(amountWei)} ETH`);
      await loadRoyalties();
    } catch (error) {
      setStatusText(`领取失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setClaimingReleaseId(null);
    }
  }, [accountAddress, controller.web25BackendBaseUrl, loadRoyalties, walletProvider]);

  if (!controller.web25Session) {
    return (
      <section className={styles.emptyPanel}>
        <div className={styles.emptyTitle}>请先完成 SIWE 登录</div>
        <div className={styles.emptyBody}>登录后可按当前钱包地址查看创作者收益和分账账户收益。</div>
        <button className={styles.primaryButton} onClick={() => void controller.handleSiweLogin()}>
          前往 Guide 登录
        </button>
      </section>
    );
  }

  return (
    <div className={styles.royaltyWorkspace}>
      <section className={styles.royaltyHero}>
        <div className={styles.royaltyHeroText}>
          <div className={styles.contentEyebrow}>Royalty Splitter</div>
          <h2 className={styles.sectionHeading}>账户 {compactAddress(accountAddress)}</h2>
          <p className={styles.contentSubtitle}>
            {controller.effectiveWeb3Settings.chainName} · {rows.length} 个相关分账合约
          </p>
        </div>
        <div className={styles.actionRow}>
          <button
            className={styles.primaryButton}
            onClick={() => void loadRoyalties()}
            disabled={loading}
          >
            {loading ? '刷新中' : '刷新收益'}
          </button>
        </div>
      </section>

      <section className={styles.metricGridWide}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>待领取</div>
          <div className={styles.metricValue}>{formatEth(totals.pendingWei)} ETH</div>
          <div className={styles.metricHint}>链上实时余额</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>已释放给我</div>
          <div className={styles.metricValue}>{formatEth(totals.releasedWei)} ETH</div>
          <div className={styles.metricHint}>来自分账合约记录</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>合约累计收入</div>
          <div className={styles.metricValue}>{formatEth(totals.receivedWei)} ETH</div>
          <div className={styles.metricHint}>余额 + 已释放</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>平均分账比例</div>
          <div className={styles.metricValue}>{totals.averageShare.toFixed(1)}%</div>
          <div className={styles.metricHint}>按相关作品平均</div>
        </div>
      </section>

      <section className={styles.royaltyGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>待领取分布</div>
              <div className={styles.cardSub}>按作品拆分当前可领取金额</div>
            </div>
          </div>
          <div className={styles.royaltyBars}>
            {rows.length === 0 && <div className={styles.emptyBody}>暂无相关分账作品。</div>}
            {rows.map((row) => {
              const width = maxPending > BigInt(0)
                ? Number((row.accountReleasableWei * BigInt(10000)) / maxPending) / 100
                : 0;
              return (
                <div className={styles.royaltyBarRow} key={row.release.id}>
                  <div className={styles.royaltyBarLabel}>{releaseLabel(row.release)}</div>
                  <div className={styles.royaltyBarTrack}>
                    <div className={styles.royaltyBarFill} style={{ width: `${Math.max(width, row.accountReleasableWei > BigInt(0) ? 3 : 0)}%` }} />
                  </div>
                  <div className={styles.royaltyBarValue}>{formatEth(row.accountReleasableWei)} ETH</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>历史领取</div>
              <div className={styles.cardSub}>{claimRows.length} 条记录</div>
            </div>
          </div>
          <div className={styles.claimHistory}>
            {claimRows.length === 0 && <div className={styles.emptyBody}>还没有领取记录。</div>}
            {claimRows.slice(0, 8).map((claim) => (
              <div className={styles.claimHistoryRow} key={claim.id}>
                <div>
                  <div className={styles.tableTitle}>{formatEth(BigInt(claim.amountWei))} ETH</div>
                  <div className={styles.tableSub}>{new Date(claim.claimedAt).toLocaleString('zh-CN')}</div>
                </div>
                <a
                  className={styles.uploadedLink}
                  href={`${controller.effectiveWeb3Settings.explorerUrl}/tx/${claim.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {compactAddress(claim.txHash)}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>收益明细</div>
            <div className={styles.cardSub}>创作者和分账账户均可查看自己参与的分账合约。</div>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.releaseTable}>
            <thead>
              <tr>
                <th>作品</th>
                <th>我的份额</th>
                <th>待领取</th>
                <th>已领取</th>
                <th>合约余额</th>
                <th>领取</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const recordedClaimTotal = claimTotalForRelease(claimRows, row.release.id);
                return (
                  <tr key={row.release.id}>
                    <td>
                      <div className={styles.tableTitle}>{releaseLabel(row.release)}</div>
                      <div className={styles.tableSub}>
                        Token #{row.release.tokenId || '-'} · {compactAddress(row.splitterAddress)}
                      </div>
                      {row.error && <div className={styles.noticeDanger}>{row.error}</div>}
                    </td>
                    <td>{row.accountSharePercent.toFixed(2)}%</td>
                    <td>{formatEth(row.accountReleasableWei)} ETH</td>
                    <td>
                      {formatEth(row.accountReleasedWei)} ETH
                      {recordedClaimTotal > BigInt(0) && (
                        <div className={styles.tableSub}>已记录 {formatEth(recordedClaimTotal)} ETH</div>
                      )}
                    </td>
                    <td>{formatEth(row.contractBalanceWei)} ETH</td>
                    <td>
                      <button
                        className={styles.primaryButton}
                        onClick={() => void handleClaim(row)}
                        disabled={
                          loading
                          || claimingReleaseId === row.release.id
                          || row.accountReleasableWei <= BigInt(0)
                          || !walletProvider
                        }
                      >
                        {claimingReleaseId === row.release.id ? '领取中' : '领取'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {statusText && <div className={styles.noticeInfo}>{statusText}</div>}
    </div>
  );
}
