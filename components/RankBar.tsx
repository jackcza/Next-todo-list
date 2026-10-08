import { StarFilled, StarOutlined, TrophyFilled } from "@ant-design/icons";
import { Progress } from "antd";
import type { CSSProperties } from "react";
import { useI18n } from "@/components/I18nProvider";
import { POINTS_PER_TASK, type Rank } from "@/lib/rank";

export default function RankBar({ rank }: { rank: Rank }) {
  const { t } = useI18n();
  const tasksToNextStar = Math.ceil(rank.pointsToNextStar / POINTS_PER_TASK);

  return (
    <section className="rank" style={{ "--rank-color": rank.color } as CSSProperties} aria-label={t.rank.label}>
      <div className="rank-head">
        <TrophyFilled className="rank-badge" />
        <span className="rank-name">{rank.name}</span>
        <span className="rank-stars" aria-label={t.rank.stars(rank.stars)}>
          {rank.maxStars === null ? (
            <>
              <StarFilled /> × {rank.stars}
            </>
          ) : (
            Array.from({ length: rank.maxStars }, (_, i) =>
              i < rank.stars ? <StarFilled key={i} /> : <StarOutlined key={i} className="rank-star-empty" />,
            )
          )}
        </span>
      </div>
      <Progress percent={Math.round(rank.progress * 100)} showInfo={false} strokeColor={rank.color} size="small" />
      <div className="rank-foot">
        <span>{t.rank.toNextStar(tasksToNextStar, rank.points)}</span>
        {rank.next ? <span>{t.rank.next(rank.next)}</span> : null}
      </div>
    </section>
  );
}
