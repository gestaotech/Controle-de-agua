import styles from './StatsCard.module.css';

interface StatsCardProps {
  icon: string;
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export default function StatsCard({ icon, title, value, color }: StatsCardProps) {
  return (
    <div className={styles.card}>
      <div className={`${styles.icon} ${styles[color]}`}>{icon}</div>
      <div className={styles.content}>
        <h3>{title}</h3>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
}
