import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareMeter, type MeterSlice } from './share-meter'
import { CHANNEL_COLORS, FOOD_COLORS } from '@/lib/chart-palette'
import { formatCurrency } from '@/lib/format'
import type { ChannelBreakdown, FoodBreakdown } from '@/types'

export function ChannelCard({
  channels,
  title = 'Where sales came from',
}: {
  channels: ChannelBreakdown
  title?: string
}) {
  const slices: MeterSlice[] = [
    {
      key: 'direct',
      label: 'Direct',
      value: channels.direct,
      share: channels.directShare,
      color: CHANNEL_COLORS.direct,
    },
    {
      key: 'swiggy',
      label: 'Swiggy',
      value: channels.swiggy,
      share: channels.swiggyShare,
      color: CHANNEL_COLORS.swiggy,
    },
    {
      key: 'zomato',
      label: 'Zomato',
      value: channels.zomato,
      share: channels.zomatoShare,
      color: CHANNEL_COLORS.zomato,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Total {formatCurrency(channels.total)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ShareMeter
          slices={slices}
          total={channels.total}
          emptyMessage="No sales recorded yet."
        />
        {channels.inconsistent && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
            Swiggy and Zomato add up to more than the recorded total, so Direct cannot be worked
            out. Please check those entries.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function FoodCard({ food }: { food: FoodBreakdown }) {
  const slices: MeterSlice[] = [
    { key: 'veg', label: 'Veg', value: food.veg, share: food.vegShare, color: FOOD_COLORS.veg },
    {
      key: 'nonveg',
      label: 'Non-Veg',
      value: food.nonVeg,
      share: food.nonVegShare,
      color: FOOD_COLORS.nonVeg,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Veg vs Non-Veg</CardTitle>
        {food.recorded && (
          <CardDescription>Of {formatCurrency(food.foodTotal)} itemised</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ShareMeter
          slices={slices}
          total={food.foodTotal}
          emptyMessage="Veg and Non-Veg amounts have not been entered."
        />
      </CardContent>
    </Card>
  )
}
