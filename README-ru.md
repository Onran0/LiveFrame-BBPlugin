# ![liveframe-plugin](assets/docs/icon.png) LiveFrame Plugin

Это плагин для [**Blockbench**](https://www.blockbench.net),
позволяющий экспортировать анимации в формат
[**LiveFrame Animation**](https://github.com/Onran0/LiveFrame/blob/master/docs/ru/public/lfa.md) (`.lfa`),
значительно упрощая анимирование и в целом интеграцию
анимаций в **[Voxel Core](https://github.com/MihailRis/voxelcore)**.

## Как установить?
1) Откройте вкладку [релизов](https://github.com/Onran0/LiveFrame-BBPlugin/releases);
2) Скачайте файл `liveframe_plugin.zip` из последнего релиза;
3) Распакуйте архив в любую папку;
4) В **Blockbench** нажмите `File -> Plugins -> Load plugin from File`
   и выберите `liveframe_plugin.js` из распакованной папки.

## Как использовать?

### Экспорт

Просто нажмите `File -> Export animations to LFA` и выберите файл,
в который вы хотите экспортировать анимации.

### Добавление событий анимации

Используйте **Инструкции анимации Blockbench** (`Animate effects -> Instructions -> Add`) для этого.
Вместо **выражения MoLang**, напишите в поле `Script`
имя события, или имя события и значение, разделённые с помощью `=`.\
Примеры: `attack`, `attack=123`

## Как сбилдить?

### Гайд для WebStorm

1) Склонируйте репозиторий через интерфейс;
2) Откройте проект `LiveFrame-BBPlugin`;
3) Напишите `npm run build` в терминал;
4) Используйте билд плагина, расположенный в `dist/liveframe_plugin/liveframe_plugin.js`
относительно корня проекта.

## Лицензия

Проект лицензирован под **Apache 2.0**.