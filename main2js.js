import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// Создание сцены
const scene = new THREE.Scene();

// Настройка камеры
const container = document.getElementById('container');
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;
const camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 1000);
camera.position.z = 15;

// Настройка рендерера
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(containerWidth, containerHeight);
container.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x2d2d30, 0);

// Настройка освещения
const ambientLight = new THREE.AmbientLight(0x808080, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Материалы для коробок
const materials = {
	number1: new THREE.MeshPhongMaterial({ color: 0x48d1cc, shininess: 100 }),
	number2: new THREE.MeshPhongMaterial({ color: 0xb3ff66, shininess: 100 }),
	result: new THREE.MeshPhongMaterial({ color: 0x8690e4, shininess: 1000 }),
};

// Загрузка шрифта
const fontLoader = new FontLoader();
let font;
fontLoader.load(
	'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
	function (loadedFont) {
		font = loadedFont;
		// После загрузки шрифта создаём коробки
		createBoxes();
	}
);

// Загрузка модели коробки
const loader = new GLTFLoader();
let model;

// Массив для хранения всех коробок
const boxes = [];

// Функция для применения материала к каждой коробке
function applyMaterial(box, material) {
	box.traverse(function (node) {
		if (node.isMesh) {
			node.material = material;
			node.castShadow = true; // Отбрасывание теней
			node.receiveShadow = true; // Получение теней
		}
	});
}

// Функция для добавления метки над коробкой
function addLabel(value, box) {
	if (!font) return;
	const textGeometry = new TextGeometry(value, {
		font: font,
		size: 0.5,
		height: 0.05,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.01,
		bevelSize: 0.01,
		bevelOffset: 0,
		bevelSegments: 3,
	});

	// Центрирование геометрии текста
	textGeometry.computeBoundingBox();
	const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
	textGeometry.translate(-center.x, -center.y + 1, -center.z);

	const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
	const textMesh = new THREE.Mesh(textGeometry, textMaterial);
	textMesh.castShadow = true; // Текст отбрасывает тени
	textMesh.receiveShadow = true; // Текст получает тени

	// Позиция метки над коробкой
	const worldPosition = new THREE.Vector3();
	box.getWorldPosition(worldPosition);
	textMesh.position.copy(worldPosition);
	textMesh.position.y += 1.5;
	textMesh.name = 'label';

	// Добавляем метку в сцену
	scene.add(textMesh);

	// Сохраняем ссылку на метку в userData коробки
	box.userData.label = textMesh;
}

// Функция создания коробок после загрузки шрифта
function createBoxes() {
	loader.load(
		'model/box1.glb',
		function (gltf) {
			model = gltf.scene;

			// Создание и настройка каждой коробки
			const positions = [-5, 0, 5]; // x координаты для трёх коробок
			const labels = ['number1', 'number2', 'result'];

			labels.forEach((label, index) => {
				const box = model.clone();
				box.position.set(positions[index], 0, 0);

				applyMaterial(box, materials[label]);
				box.castShadow = true; // Коробка отбрасывает тени
				box.receiveShadow = true; // Коробка получает тени
				scene.add(box);
				addLabel(label, box);
				boxes.push(box); // Добавляем коробку в массив
			});
		},
		undefined,
		function (error) {
			console.error(error);
		}
	);
}

function updateResultBoxLabel(operation) {
	const resultBox = boxes[2];

	// Удаляем старую метку
	if (resultBox.userData.label) {
		scene.remove(resultBox.userData.label);
		resultBox.userData.label.geometry.dispose();
		resultBox.userData.label.material.dispose();
		delete resultBox.userData.label;
	}

	const label = operation === '+' ? 'summa' : 'difference';
	addLabel(label, resultBox);
}

// Обработка изменения размера окна
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
	const containerWidth = container.clientWidth;
	const containerHeight = container.clientHeight;

	camera.aspect = containerWidth / containerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(containerWidth, containerHeight);
}

// Анимация сцены
function animate() {
	requestAnimationFrame(animate);

	// Обновляем позиции меток
	boxes.forEach((box) => {
		if (box.userData.label) {
			const worldPosition = new THREE.Vector3();
			box.getWorldPosition(worldPosition);
			box.userData.label.position.copy(worldPosition);
			box.userData.label.position.y += 1.5;
		}
	});

	renderer.render(scene, camera);
}
animate();

// Кнопка изменения прозрачности
let isTransparent = false;

function toggleOpacity() {
	isTransparent = !isTransparent;
	Object.values(materials).forEach((material) => {
		material.transparent = isTransparent;
		material.opacity = isTransparent ? 0.2 : 1;
		material.needsUpdate = true;
	});
}

document.getElementById('toggleOpacityButton').addEventListener('click', toggleOpacity);

// Кнопка запуска анимации
const animateButton = document.getElementById('animateButton');
let isAnimating = false;

// Добавляем переменную для отслеживания текущего шага
let currentStep = 0;

// Модифицированный обработчик события для кнопки animateButton
animateButton.addEventListener('click', function () {
	if (!isAnimating) {
		if (currentStep === 0) {
			// Шаг 1: Ввод первого числа
			const number1Value = parseInt(document.getElementById('number1Input').value.trim());

			// Проверка ввода
			if (isNaN(number1Value)) {
				alert('Введите корректное первое число.');
				return;
			}

			// Обновляем блок кода
			document.getElementById('number1Value').innerText = number1Value;

			// Анимация падения числа в первую коробку
			animateNumberInput(number1Value, boxes[0]);

			currentStep++;
			animateButton.innerText = 'Инициализировать 2';
		} else if (currentStep === 1) {
			// Шаг 2: Ввод второго числа
			const number2Value = parseInt(document.getElementById('number2Input').value.trim());

			// Проверка ввода
			if (isNaN(number2Value)) {
				alert('Введите корректное второе число.');
				return;
			}

			// Обновляем блок кода
			document.getElementById('number2Value').innerText = number2Value;

			// Анимация падения числа во вторую коробку
			animateNumberInput(number2Value, boxes[1]);

			currentStep++;
			animateButton.innerText = 'Выбрать операцию';
		} else if (currentStep === 2) {
			// Шаг 3: Выбор операции
			const operation = document.getElementById('operationSelect').value;

			if (!operation) {
				alert('Выберите операцию.');
				return;
			}

			// Обновляем блок кода
			document.getElementById('operation').innerText = operation;

			currentStep++;
			animateButton.innerText = 'Запустить анимацию';
		} else if (currentStep === 3) {
			// Запуск анимации сложения или вычитания
			const number1Value = parseInt(document.getElementById('number1Input').value.trim());
			const number2Value = parseInt(document.getElementById('number2Input').value.trim());
			const operation = document.getElementById('operationSelect').value;

			// Обновляем название переменной результата в коде
			const resultVarName = operation === '+' ? 'summa' : 'difference';
			document.getElementById('resultVarName').innerText = resultVarName;
			document.getElementById('resultVarName2').innerText = resultVarName;
			document.getElementById('resultVarName3').innerText = resultVarName;

			// Обновляем метку над коробкой результата
			updateResultBoxLabel(operation);

			// Очищаем предыдущие тексты и формулы
			clearOldTexts();
			clearFormula();

			// Запускаем анимацию операции
			animateOperation(number1Value, number2Value, operation);

			// Сбрасываем шаги
			currentStep = 0;
			animateButton.innerText = 'Инициализировать 1';
		}

		// Закрываем меню на мобильных устройствах
		const controls = document.querySelector('.controls');
		controls.classList.remove('open');
	}
});

// Функция анимации падения числа в коробку
function animateNumberInput(numberValue, box) {
	// Проверяем, есть ли уже число в коробке (кроме метки)
	const existingTexts = [];
	box.children.forEach((child) => {
		if (child.isMesh && child.geometry.type === 'TextGeometry' && child.name !== 'label') {
			existingTexts.push(child);
		}
	});

	// Анимация подъёма и исчезновения старого числа
	existingTexts.forEach((textMesh) => {
		const startY = textMesh.position.y;
		const endY = startY + 1; // Поднимаем на 1 единицу вверх
		const duration = 1000; // 1 секунда
		const startTime = performance.now();

		function animateRise() {
			const currentTime = performance.now();
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			textMesh.position.y = THREE.MathUtils.lerp(startY, endY, easeInOutQuad(progress));
			textMesh.material.opacity = 1 - progress;

			if (progress < 1) {
				requestAnimationFrame(animateRise);
			} else {
				// Удаляем текст из коробки
				box.remove(textMesh);
				textMesh.geometry.dispose();
				textMesh.material.dispose();
			}
		}

		animateRise();
	});

	// После удаления старого числа, добавляем новое с анимацией падения
	setTimeout(() => {
		// Создание геометрии текста для нового числа
		const textGeometry = new TextGeometry(numberValue.toString(), {
			font: font,
			size: 0.5,
			height: 0.05,
			curveSegments: 12,
			bevelEnabled: true,
			bevelThickness: 0.01,
			bevelSize: 0.01,
			bevelOffset: 0,
			bevelSegments: 3,
		});

		// Центрирование геометрии текста
		textGeometry.computeBoundingBox();
		const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
		textGeometry.translate(-center.x, -center.y, -center.z);

		// Создание материала для текста
		const textMaterial = new THREE.MeshPhongMaterial({
			color: 0xffff00,
			transparent: true,
			opacity: 1,
		});

		// Создание меша текста
		const textMesh = new THREE.Mesh(textGeometry, textMaterial);
		textMesh.castShadow = true;
		textMesh.receiveShadow = true;

		// Начальная позиция текста над коробкой
		textMesh.position.set(0, 1.5, 0);

		// Добавление текста в коробку
		box.add(textMesh);

		// Анимация падения текста в коробку
		const startY = textMesh.position.y;
		const endY = 0.3; // Внутри коробки
		const duration = 1000; // 1 секунда
		const startTime = performance.now();

		function animateFall() {
			const currentTime = performance.now();
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			textMesh.position.y = THREE.MathUtils.lerp(startY, endY, easeInOutQuad(progress));

			if (progress < 1) {
				requestAnimationFrame(animateFall);
			}
		}

		animateFall();
	}, 1000); // Задержка 1 секунда для завершения анимации подъёма старого числа
}

// Функция очистки старых текстов перед новой анимацией
function clearOldTexts() {
	boxes.forEach((box) => {
		const textsToRemove = [];
		box.children.forEach((child) => {
			if (child.isMesh && child.geometry.type === 'TextGeometry' && child.name !== 'label') {
				textsToRemove.push(child);
			}
		});
		textsToRemove.forEach((textMesh) => {
			box.remove(textMesh);
			textMesh.geometry.dispose();
			textMesh.material.dispose();
		});
	});
}

// Функция удаления формулы над коробкой результата
function clearFormula() {
	const resultBox = boxes[2];
	const textsToRemove = [];
	resultBox.children.forEach((child) => {
		if (child.isMesh && child.geometry.type === 'TextGeometry' && child.name === 'formula') {
			textsToRemove.push(child);
		}
	});
	textsToRemove.forEach((textMesh) => {
		resultBox.remove(textMesh);
		textMesh.geometry.dispose();
		textMesh.material.dispose();
	});
}

function animateOperation(number1Value, number2Value, operation) {
	// Вычисление результата
	let resultValue;
	if (operation === '+') {
		resultValue = number1Value + number2Value;
	} else if (operation === '-') {
		resultValue = number1Value - number2Value;
	}

	// Создание текстов для чисел и результата
	const values = [
		{ value: number1Value, box: boxes[0] },
		{ value: number2Value, box: boxes[1] },
	];

	// Проверка наличия шрифта
	if (!font) {
		alert('Шрифт ещё не загружен. Попробуйте ещё раз.');
		return;
	}

	// Добавление значений в коробки number1 и number2 (если не добавлены)
	values.forEach((item) => {
		// Очищаем старые тексты внутри коробок
		const textsToRemove = [];
		item.box.children.forEach((child) => {
			if (child.isMesh && child.geometry.type === 'TextGeometry' && child.name !== 'label') {
				textsToRemove.push(child);
			}
		});
		textsToRemove.forEach((textMesh) => {
			item.box.remove(textMesh);
			textMesh.geometry.dispose();
			textMesh.material.dispose();
		});

		const textGeometry = new TextGeometry(item.value.toString(), {
			font: font,
			size: 0.5,
			height: 0.05,
			curveSegments: 12,
			bevelEnabled: true,
			bevelThickness: 0.01,
			bevelSize: 0.01,
			bevelOffset: 0,
			bevelSegments: 3,
		});

		// Центрирование геометрии текста
		textGeometry.computeBoundingBox();
		const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
		textGeometry.translate(-center.x, -center.y, -center.z);

		// Создание материала для текста
		const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });

		// Создание меша текста
		const textMesh = new THREE.Mesh(textGeometry, textMaterial);
		textMesh.castShadow = true;
		textMesh.receiveShadow = true;

		// Позиция текста внутри коробки
		const targetPosition = new THREE.Vector3(0, 0.3, 0);
		textMesh.position.copy(targetPosition);

		// Добавление текста в коробку
		item.box.add(textMesh);
	});

	// Анимация перемещения значений в коробку результата
	const startPositions = [boxes[0], boxes[1]].map((box) => {
		const position = new THREE.Vector3();
		box.getWorldPosition(position);
		position.y += 0.3; // Поднимаем до уровня текста
		return position;
	});

	const resultBox = boxes[2];
	const resultPosition = new THREE.Vector3();
	resultBox.getWorldPosition(resultPosition);
	resultPosition.y += 0.3;

	const movingTexts = [];

	values.forEach((item, index) => {
		// Создание геометрии текста для анимации
		const textGeometry = new TextGeometry(item.value.toString(), {
			font: font,
			size: 0.5,
			height: 0.05,
			curveSegments: 12,
			bevelEnabled: true,
			bevelThickness: 0.01,
			bevelSize: 0.01,
			bevelOffset: 0,
			bevelSegments: 3,
		});

		// Центрирование геометрии текста
		textGeometry.computeBoundingBox();
		const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
		textGeometry.translate(-center.x, -center.y, -center.z);

		// Создание материала для текста
		const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

		// Создание меша текста
		const textMesh = new THREE.Mesh(textGeometry, textMaterial);
		textMesh.castShadow = true;
		textMesh.receiveShadow = true;

		// Установка начальной позиции текста
		textMesh.position.copy(startPositions[index]);

		scene.add(textMesh);
		movingTexts.push(textMesh);
	});

	// Анимация перемещения
	const duration = 1000; // Время анимации в миллисекундах
	const startTime = performance.now();

	function animateTexts() {
		const currentTime = performance.now();
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / duration, 1); // Ограничение до 1

		movingTexts.forEach((textMesh, index) => {
			const startPosition = startPositions[index];
			textMesh.position.lerpVectors(startPosition, resultPosition, easeInOutQuad(progress));
		});

		if (progress < 1) {
			requestAnimationFrame(animateTexts);
		} else {
			// Завершение анимации
			movingTexts.forEach((textMesh) => {
				scene.remove(textMesh);
				textMesh.geometry.dispose();
				textMesh.material.dispose();
			});

			// Добавление результата в коробку результата
			addResultToBox(resultValue);

			isAnimating = false;
		}
	}

	isAnimating = true;
	animateTexts();

	// Добавление формулы над коробкой результата
	addFormulaAboveBox(number1Value, number2Value, operation, resultBox);
}

// Функция добавления результата в коробку
function addResultToBox(resultValue) {
	const resultBox = boxes[2];

	// Очищаем старые тексты внутри коробки результата, кроме метки и формулы
	const textsToRemove = [];
	resultBox.children.forEach((child) => {
		if (
			child.isMesh &&
			child.geometry.type === 'TextGeometry' &&
			child.name !== 'label' &&
			child.name !== 'formula'
		) {
			textsToRemove.push(child);
		}
	});
	textsToRemove.forEach((textMesh) => {
		resultBox.remove(textMesh);
		textMesh.geometry.dispose();
		textMesh.material.dispose();
	});

	const textGeometry = new TextGeometry(resultValue.toString(), {
		font: font,
		size: 0.5,
		height: 0.05,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.01,
		bevelSize: 0.01,
		bevelOffset: 0,
		bevelSegments: 3,
	});

	// Центрирование геометрии текста
	textGeometry.computeBoundingBox();
	const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
	textGeometry.translate(-center.x, -center.y, -center.z);

	// Создание материала для текста
	const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });

	// Создание меша текста
	const textMesh = new THREE.Mesh(textGeometry, textMaterial);
	textMesh.castShadow = true;
	textMesh.receiveShadow = true;

	// Позиция текста внутри коробки
	const targetPosition = new THREE.Vector3(0, 1, 0); // Немного выше, чтобы текст "падал" вниз
	textMesh.position.copy(targetPosition);

	// Добавление текста в коробку результата
	resultBox.add(textMesh);

	// Анимация "падения" текста в коробку
	const dropStartTime = performance.now();
	const dropDuration = 1000;

	function animateDrop() {
		const currentTime = performance.now();
		const dropProgress = Math.min((currentTime - dropStartTime) / dropDuration, 1);

		// Плавное падение текста вниз
		textMesh.position.y = THREE.MathUtils.lerp(1, 0.3, easeInOutQuad(dropProgress));

		if (dropProgress < 1) {
			requestAnimationFrame(animateDrop);
		}
	}

	animateDrop();
}

// Функция добавления формулы над коробкой результата
function addFormulaAboveBox(number1Value, number2Value, operation, box) {
	// Удаление старой формулы, если она есть
	if (box.userData.formula) {
		scene.remove(box.userData.formula);
		box.userData.formula.geometry.dispose();
		box.userData.formula.material.dispose();
		delete box.userData.formula;
	}

	const formula = `${number1Value} ${operation} ${number2Value}`;

	const textGeometry = new TextGeometry(formula, {
		font: font,
		size: 0.5,
		height: 0.05,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.01,
		bevelSize: 0.01,
		bevelOffset: 0,
		bevelSegments: 3,
	});

	// Центрирование геометрии текста
	textGeometry.computeBoundingBox();
	const center = textGeometry.boundingBox.getCenter(new THREE.Vector3());
	textGeometry.translate(-center.x, -center.y - 0.1, -center.z);

	const textMaterial = new THREE.MeshPhongMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 1,
	});
	const textMesh = new THREE.Mesh(textGeometry, textMaterial);
	textMesh.castShadow = true;
	textMesh.receiveShadow = true;

	// Начальная позиция текста над коробкой
	const worldPosition = new THREE.Vector3();
	box.getWorldPosition(worldPosition);
	textMesh.position.copy(worldPosition);
	textMesh.position.y += 2; // Расстояние над коробкой
	textMesh.name = 'formula'; // Добавляем имя для идентификации

	// Добавляем текст в сцену
	scene.add(textMesh);

	// Сохраняем ссылку на формулу в userData коробки
	box.userData.formula = textMesh;
}

// Функция плавного перехода (easing)
function easeInOutQuad(t) {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/* Остальной код, связанный с вращением и обработкой событий, остаётся без изменений */
// Вращение коробок
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedBox = null;
let isDragging = false;
let previousMousePosition = {
	x: 0,
	y: 0,
};

// Функция для обработки нажатия мыши или касания
function onPointerDown(event) {
	event.preventDefault();

	const rect = renderer.domElement.getBoundingClientRect();

	if (event.touches) {
		mouse.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
	} else {
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	raycaster.setFromCamera(mouse, camera);

	const intersects = raycaster.intersectObjects(boxes, true);

	if (intersects.length > 0) {
		selectedBox = intersects[0].object.parent;
		isDragging = true;
		if (event.touches) {
			previousMousePosition = {
				x: event.touches[0].clientX,
				y: event.touches[0].clientY,
			};
		} else {
			previousMousePosition = {
				x: event.clientX,
				y: event.clientY,
			};
		}
	}
}

// Функция для обработки движения мыши или касания
function onPointerMove(event) {
	if (!isDragging || !selectedBox) return;

	let deltaMove;
	if (event.touches) {
		deltaMove = {
			x: event.touches[0].clientX - previousMousePosition.x,
			y: event.touches[0].clientY - previousMousePosition.y,
		};
		previousMousePosition = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY,
		};
	} else {
		deltaMove = {
			x: event.clientX - previousMousePosition.x,
			y: event.clientY - previousMousePosition.y,
		};
		previousMousePosition = {
			x: event.clientX,
			y: event.clientY,
		};
	}

	// Вращение коробки
	selectedBox.rotation.y += deltaMove.x * 0.005;
	selectedBox.rotation.x += deltaMove.y * 0.005;
}

// Функция для обработки отпускания мыши или касания
function onPointerUp(event) {
	isDragging = false;
	selectedBox = null;
}

// Добавление обработчиков событий мыши и сенсорных событий
renderer.domElement.addEventListener('mousedown', onPointerDown, false);
renderer.domElement.addEventListener('mousemove', onPointerMove, false);
renderer.domElement.addEventListener('mouseup', onPointerUp, false);

renderer.domElement.addEventListener('touchstart', onPointerDown, false);
renderer.domElement.addEventListener('touchmove', onPointerMove, false);
renderer.domElement.addEventListener('touchend', onPointerUp, false);

// Обработчик для кнопки меню на мобильных устройствах
document.getElementById('menuToggle').addEventListener('click', function () {
	const controls = document.querySelector('.controls');
	controls.classList.toggle('open');
});
