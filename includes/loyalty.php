<?php
declare(strict_types=1);

const WELCOME_BONUS_POINTS = 50;

function loyalty_tier_for(int $points): string {
    if ($points >= 500) return 'Gold';
    if ($points >= 100) return 'Silver';
    return 'Bronze';
}

function points_to_next_tier(int $points): ?array {
    if ($points < 100) return ['nextTier' => 'Silver', 'pointsNeeded' => 100 - $points];
    if ($points < 500) return ['nextTier' => 'Gold',   'pointsNeeded' => 500 - $points];
    return null;
}
