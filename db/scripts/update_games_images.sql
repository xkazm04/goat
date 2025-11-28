-- SQL Script to update games items with local image URLs
-- These images are stored in /public/games/ folder

-- Update games with matching local images
-- Using exact name matching with URL-encoded paths for special characters

UPDATE public.items SET image_url = '/games/Age Of Empires 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Age of Empires II');

UPDATE public.items SET image_url = '/games/Apex Legend alt.webp', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Apex Legends');

UPDATE public.items SET image_url = '/games/Assassin''s Creed IV Black Flag.webp', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Assassin%Creed%Black Flag%');

UPDATE public.items SET image_url = '/games/Baldurs Gate 3.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Baldur%Gate%3%');

UPDATE public.items SET image_url = '/games/Batman Arkham City.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Batman%Arkham%City%');

UPDATE public.items SET image_url = '/games/BioShock Infinite.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%BioShock%Infinite%');

UPDATE public.items SET image_url = '/games/Black Myth Wukong.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Black Myth%Wukong%');

UPDATE public.items SET image_url = '/games/Bloodborne.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Bloodborne');

UPDATE public.items SET image_url = '/games/Borderlands 2.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Borderlands 2');

UPDATE public.items SET image_url = '/games/Call of Duty Modern Warfare 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Call of Duty%Modern Warfare%2%');

UPDATE public.items SET image_url = '/games/Chrono Trigger.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Chrono Trigger');

UPDATE public.items SET image_url = '/games/Civilization VI.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Civilization%VI%');

UPDATE public.items SET image_url = '/games/Command & Conquer Red Alert 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Command%Conquer%Red Alert%2%');

UPDATE public.items SET image_url = '/games/Counter Strike 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Counter%Strike%2%');

UPDATE public.items SET image_url = '/games/Cyberpunk 2077.webp', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Cyberpunk%2077%');

UPDATE public.items SET image_url = '/games/Dark Souls.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Dark Souls');

UPDATE public.items SET image_url = '/games/Deus Ex Human Revolution.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Deus Ex%Human Revolution%');

UPDATE public.items SET image_url = '/games/Diablo II.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Diablo%II%');

UPDATE public.items SET image_url = '/games/Disco Elysium.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Disco%Elysium%');

UPDATE public.items SET image_url = '/games/Dishonored.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Dishonored');

UPDATE public.items SET image_url = '/games/Divinity Original Sin II.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Divinity%Original Sin%II%');

UPDATE public.items SET image_url = '/games/Doom Eternal.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Doom%Eternal%');

UPDATE public.items SET image_url = '/games/Dota 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Dota 2');

UPDATE public.items SET image_url = '/games/Dragon Age Origins.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Dragon Age%Origins%');

UPDATE public.items SET image_url = '/games/Elden Ring.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Elden Ring');

UPDATE public.items SET image_url = '/games/Expedition 33.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Expedition%33%');

UPDATE public.items SET image_url = '/games/Fable.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Fable');

UPDATE public.items SET image_url = '/games/Fallout 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Fallout 2');

UPDATE public.items SET image_url = '/games/Fallout 3.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Fallout 3');

UPDATE public.items SET image_url = '/games/Fallout 4.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Fallout 4');

UPDATE public.items SET image_url = '/games/Fallout New Vegas.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Fallout%New Vegas%');

UPDATE public.items SET image_url = '/games/Final Fantasy XVI.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Final Fantasy%XVI%');

UPDATE public.items SET image_url = '/games/For Honor.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('For Honor');

UPDATE public.items SET image_url = '/games/Fortnite.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Fortnite');

UPDATE public.items SET image_url = '/games/Ghost of Tsushima.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Ghost%Tsushima%');

UPDATE public.items SET image_url = '/games/God of War Ragnarok.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%God of War%Ragnar%k%');

UPDATE public.items SET image_url = '/games/God of War.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('God of War');

UPDATE public.items SET image_url = '/games/GTA San Andreas.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%GTA%San Andreas%');

UPDATE public.items SET image_url = '/games/GTA V.png', updated_at = NOW()
WHERE category = 'games' AND (LOWER(name) LIKE LOWER('%GTA%V%') OR LOWER(name) LIKE LOWER('%Grand Theft Auto%V%'));

UPDATE public.items SET image_url = '/games/Hades.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Hades');

UPDATE public.items SET image_url = '/games/Half-Life 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Half-Life%2%');

UPDATE public.items SET image_url = '/games/Halo 2.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Halo 2');

UPDATE public.items SET image_url = '/games/Heroes of Might and Magic III.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Heroes%Might%Magic%III%');

UPDATE public.items SET image_url = '/games/Hollow Knight.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Hollow Knight');

UPDATE public.items SET image_url = '/games/Horizon Zero Dawn.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Horizon%Zero%Dawn%');

UPDATE public.items SET image_url = '/games/It takes Two.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%It%Takes%Two%');

UPDATE public.items SET image_url = '/games/Kingdome Come Deliverance II.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Kingdom Come%Deliverance%II%');

UPDATE public.items SET image_url = '/games/League of Legends.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('League of Legends');

UPDATE public.items SET image_url = '/games/Left 4 Dead 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Left%4%Dead%2%');

UPDATE public.items SET image_url = '/games/Lies of P.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Lies of P');

UPDATE public.items SET image_url = '/games/Mafia.webp', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Mafia');

UPDATE public.items SET image_url = '/games/Mass Effect 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) = LOWER('Mass Effect 2');

UPDATE public.items SET image_url = '/games/Metal Gear Solid 3 Snake Eater.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Metal Gear%Solid%3%');

UPDATE public.items SET image_url = '/games/Metaphor ReFantazio.png', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Metaphor%ReFantazio%');

UPDATE public.items SET image_url = '/games/Path of Exile 2.jpg', updated_at = NOW()
WHERE category = 'games' AND LOWER(name) LIKE LOWER('%Path%Exile%2%');

-- Verify the updates
SELECT name, image_url 
FROM public.items 
WHERE category = 'games' AND image_url IS NOT NULL AND image_url LIKE '/games/%'
ORDER BY name;
