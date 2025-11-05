import { BasketBg } from '@/components/app/icons/bg/bgBasket';
import { BasketIcon } from '@/components/app/icons/cats/sportIcons';

export const getSubcategoryBackground = (subcategory: string) => {
    const color = 'white';
    const width = 150
    switch (subcategory.toLowerCase()) {
        case 'football':
            return <BasketBg color={color} width={width} />
        case 'basketball':
            return <BasketBg color={color} width={width} />
        case 'hockey':
            return <BasketBg color={color} width={width} />
        default:
            return <BasketBg color={color} width={width} />;
    }
}


export const getSubcategoryIcon = (subcategory: string) => {
    const color = 'white';
    const width = 50
    switch (subcategory.toLowerCase()) {
        case 'football':
            return <BasketIcon color={'#f59e0b'} width={width} />
        case 'basketball':
            return <BasketIcon color={'#f59e0b'} width={width} />
        case 'hockey':
            return <BasketIcon color={color} width={width} />
        default:
            return <BasketIcon color={color} width={width} />;
    }
}