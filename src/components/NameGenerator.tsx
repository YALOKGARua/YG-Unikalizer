import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUser, FaGlobe, FaCopy, FaRandom, FaMale, FaFemale, FaLanguage } from 'react-icons/fa'
import { toast } from 'sonner'

const NAMES_DATABASE = {
  'Украина': {
    maleNames: ['Александр', 'Андрей', 'Дмитрий', 'Владимир', 'Сергей', 'Николай', 'Виктор', 'Максим', 'Иван', 'Михаил', 'Олег', 'Юрий', 'Анатолий', 'Владислав', 'Богдан', 'Ярослав', 'Тарас', 'Василий', 'Петр', 'Роман'],
    femaleNames: ['Елена', 'Ольга', 'Наталья', 'Анна', 'Татьяна', 'Светлана', 'Марина', 'Ирина', 'Екатерина', 'Людмила', 'Галина', 'Валентина', 'Юлия', 'Анастасия', 'Оксана', 'Виктория', 'Лариса', 'Мария', 'Надежда', 'Алла'],
    lastNames: ['Коваленко', 'Шевченко', 'Бондаренко', 'Ткаченко', 'Кравченко', 'Лысенко', 'Гриценко', 'Петренко', 'Савченко', 'Семененко', 'Мельниченко', 'Марченко', 'Руденко', 'Иваненко', 'Степаненко', 'Панченко', 'Данченко', 'Левченко', 'Павленко', 'Науменко']
  },
  'Россия': {
    maleNames: ['Александр', 'Сергей', 'Алексей', 'Владимир', 'Андрей', 'Дмитрий', 'Максим', 'Михаил', 'Иван', 'Артём', 'Роман', 'Евгений', 'Николай', 'Денис', 'Павел', 'Юрий', 'Виктор', 'Игорь', 'Константин', 'Олег'],
    femaleNames: ['Анна', 'Елена', 'Ольга', 'Татьяна', 'Наталья', 'Ирина', 'Екатерина', 'Светлана', 'Мария', 'Галина', 'Людмила', 'Юлия', 'Валентина', 'Анастасия', 'Виктория', 'Любовь', 'Надежда', 'Лариса', 'Вера', 'Марина'],
    lastNames: ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев']
  },
  'США': {
    maleNames: ['James', 'Robert', 'John', 'Michael', 'William', 'David', 'Richard', 'Charles', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Paul', 'Mark', 'Donald', 'Steven', 'Kenneth', 'Joshua', 'Kevin', 'Brian'],
    femaleNames: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle'],
    lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
  },
  'Великобритания': {
    maleNames: ['Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Noah', 'Charlie', 'Muhammad', 'Thomas', 'Oscar', 'William', 'James', 'Henry', 'Leo', 'Alfie', 'Joshua', 'Freddie', 'Ethan', 'Archie', 'Isaac'],
    femaleNames: ['Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Isabella', 'Sophia', 'Grace', 'Lily', 'Freya', 'Emily', 'Ivy', 'Ella', 'Rosie', 'Evie', 'Florence', 'Poppy', 'Charlotte', 'Evelyn', 'Piper'],
    lastNames: ['Smith', 'Jones', 'Taylor', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts', 'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright']
  },
  'Германия': {
    maleNames: ['Noah', 'Ben', 'Matteo', 'Finn', 'Leon', 'Elias', 'Paul', 'Henry', 'Luis', 'Felix', 'Luca', 'Jonas', 'Emil', 'Anton', 'Liam', 'Theo', 'Jakob', 'Samuel', 'Maximilian', 'David'],
    femaleNames: ['Emilia', 'Hannah', 'Emma', 'Sophia', 'Lina', 'Ella', 'Mia', 'Clara', 'Lea', 'Marie', 'Leni', 'Mathilda', 'Frieda', 'Lia', 'Amelie', 'Luisa', 'Nora', 'Ida', 'Greta', 'Paula'],
    lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann']
  },
  'Франция': {
    maleNames: ['Gabriel', 'Léo', 'Raphaël', 'Arthur', 'Louis', 'Lucas', 'Adam', 'Jules', 'Hugo', 'Maël', 'Tom', 'Noah', 'Éthan', 'Mathis', 'Nathan', 'Théo', 'Sacha', 'Benjamin', 'Aaron', 'Martin'],
    femaleNames: ['Jade', 'Louise', 'Emma', 'Ambre', 'Alice', 'Rose', 'Chloé', 'Lina', 'Mila', 'Léa', 'Manon', 'Mathilde', 'Juliette', 'Clémence', 'Camille', 'Marie', 'Sarah', 'Zoé', 'Eva', 'Romane'],
    lastNames: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefèvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard']
  },
  'Италия': {
    maleNames: ['Leonardo', 'Francesco', 'Lorenzo', 'Alessandro', 'Andrea', 'Mattia', 'Gabriele', 'Tommaso', 'Riccardo', 'Edoardo', 'Matteo', 'Giuseppe', 'Antonio', 'Marco', 'Giovanni', 'Luca', 'Federico', 'Niccolò', 'Samuele', 'Michele'],
    femaleNames: ['Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Greta', 'Beatrice', 'Anna', 'Vittoria', 'Matilde', 'Noemi', 'Francesca', 'Sara', 'Azzurra', 'Iris', 'Ludovica', 'Gaia', 'Martina'],
    lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti']
  },
  'Испания': {
    maleNames: ['Hugo', 'Martín', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Manuel', 'Pablo', 'Álvaro', 'Adrián', 'Diego', 'Mario', 'David', 'Enzo', 'Thiago', 'Marco', 'Antonio', 'Gonzalo', 'Nicolás'],
    femaleNames: ['Lucía', 'María', 'Martina', 'Paula', 'Julia', 'Daniela', 'Valeria', 'Alba', 'Emma', 'Carla', 'Sara', 'Sofía', 'Carmen', 'Alma', 'Claudia', 'Vega', 'Laia', 'Jimena', 'Chloe', 'Olivia'],
    lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez']
  },
  'Польша': {
    maleNames: ['Antoni', 'Jan', 'Aleksander', 'Franciszek', 'Jakub', 'Leon', 'Ignacy', 'Stanisław', 'Mikołaj', 'Adam', 'Nikodem', 'Wojciech', 'Marcel', 'Wiktor', 'Kacper', 'Tymon', 'Filip', 'Szymon', 'Maksymilian', 'Michał'],
    femaleNames: ['Zuzanna', 'Julia', 'Zofia', 'Hanna', 'Maja', 'Lena', 'Alicja', 'Maria', 'Amelia', 'Oliwia', 'Pola', 'Emilia', 'Antonina', 'Łucja', 'Marcelina', 'Nadia', 'Helena', 'Wiktoria', 'Gabriela', 'Laura'],
    lastNames: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Kaczmarek', 'Piotrowski', 'Grabowski', 'Nowakowski']
  },
  'Японія': {
    maleNames: ['Hiroshi', 'Takeshi', 'Satoshi', 'Yuki', 'Haruto', 'Sota', 'Yuito', 'Minato', 'Riku', 'Asahi', 'Hinata', 'Itsuki', 'Yuto', 'Ren', 'Yamato', 'Aoto', 'Hayato', 'Akira', 'Daiki', 'Kazuto'],
    femaleNames: ['Yui', 'Rei', 'Himari', 'Kohana', 'Akari', 'Mio', 'Saki', 'Hana', 'Yuna', 'Ema', 'Ichika', 'Kokone', 'Aoi', 'Sara', 'Rin', 'Nanami', 'Rio', 'Tsumugi', 'Shiori', 'Yuzuki'],
    lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki']
  },
  'Китай': {
    maleNames: ['Wei', 'Jun', 'Ming', 'Lei', 'Hao', 'Qiang', 'Long', 'Yang', 'Bin', 'Jian', 'Feng', 'Chao', 'Gang', 'Kai', 'Dong', 'Peng', 'Tao', 'Hui', 'Rui', 'Yu'],
    femaleNames: ['Li', 'Mei', 'Fang', 'Hong', 'Ying', 'Xiu', 'Juan', 'Min', 'Jing', 'Na', 'Yan', 'Ping', 'Xia', 'Hui', 'Qin', 'Lan', 'Ning', 'Rui', 'Jie', 'Yu'],
    lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Lin', 'Guo', 'He', 'Gao', 'Luo']
  },
  'Індія': {
    maleNames: ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Aarush', 'Kabir', 'Aryan', 'Dhruv', 'Kiaan', 'Ryan'],
    femaleNames: ['Saanvi', 'Aadhya', 'Kiara', 'Diya', 'Pihu', 'Prisha', 'Ananya', 'Fatima', 'Anika', 'Ira', 'Myra', 'Sara', 'Aditi', 'Kavya', 'Arya', 'Riya', 'Navya', 'Zara', 'Pari', 'Angel'],
    lastNames: ['Patel', 'Singh', 'Kumar', 'Sharma', 'Gupta', 'Shah', 'Jain', 'Agarwal', 'Verma', 'Mishra', 'Yadav', 'Chopra', 'Malhotra', 'Bansal', 'Tiwari', 'Arora', 'Mittal', 'Kapoor', 'Saxena', 'Sinha']
  },
  'Бразилія': {
    maleNames: ['Miguel', 'Arthur', 'Gael', 'Theo', 'Heitor', 'Ravi', 'Davi', 'Bernardo', 'Noah', 'Gabriel', 'Samuel', 'Vicente', 'Joaquim', 'Benício', 'Nicolas', 'Guilherme', 'Rafael', 'Lorenzo', 'Henrique', 'Pedro'],
    femaleNames: ['Alice', 'Sophia', 'Helena', 'Valentina', 'Laura', 'Isabella', 'Manuela', 'Júlia', 'Heloísa', 'Luiza', 'Maria Luiza', 'Lorena', 'Lívia', 'Giovanna', 'Maria Eduarda', 'Beatriz', 'Maria Clara', 'Cecília', 'Eloá', 'Lara'],
    lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Ramos', 'Almeida', 'Dias', 'Monteiro', 'Mendes', 'Barros', 'Freitas', 'Barbosa']
  },
  'Нідерланди': {
    maleNames: ['Daan', 'Sem', 'Milan', 'Luca', 'Lucas', 'Liam', 'Finn', 'Noa', 'Mees', 'Bram', 'Siem', 'Boaz', 'Levi', 'Oliver', 'Ties', 'Jens', 'Gijs', 'Sam', 'Adam', 'Jesse'],
    femaleNames: ['Emma', 'Julia', 'Mila', 'Tess', 'Sophie', 'Zoë', 'Sara', 'Nora', 'Eva', 'Liv', 'Lotte', 'Anna', 'Isa', 'Lynn', 'Fenna', 'Nina', 'Roos', 'Floor', 'Lara', 'Fleur'],
    lastNames: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer']
  },
  'Швеція': {
    maleNames: ['William', 'Liam', 'Noah', 'Oliver', 'Hugo', 'Lucas', 'Adam', 'Elias', 'Theo', 'Leon', 'Viktor', 'Isak', 'Emil', 'Olle', 'Alexander', 'Oscar', 'Ludvig', 'Adrian', 'Axel', 'Filip'],
    femaleNames: ['Alice', 'Maja', 'Vera', 'Alma', 'Selma', 'Elsa', 'Lilly', 'Astrid', 'Ella', 'Wilma', 'Olivia', 'Clara', 'Saga', 'Stella', 'Elvira', 'Ines', 'Agnes', 'Ebba', 'Alicia', 'Leah'],
    lastNames: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Jakobsson', 'Magnusson', 'Olofsson']
  },
  'Норвегія': {
    maleNames: ['Jakob', 'Emil', 'Noah', 'Oliver', 'Filip', 'William', 'Lucas', 'Liam', 'Aksel', 'Oskar', 'Magnus', 'Theo', 'Adam', 'Benjamin', 'Victor', 'Mathias', 'Sander', 'Elias', 'Henrik', 'Alexander'],
    femaleNames: ['Nora', 'Emma', 'Olivia', 'Saga', 'Sofie', 'Ella', 'Emilie', 'Sara', 'Leah', 'Maja', 'Anna', 'Ingrid', 'Frida', 'Thea', 'Astrid', 'Iben', 'Ada', 'Hedda', 'Mathilde', 'Live'],
    lastNames: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Halvorsen']
  },
  'Данія': {
    maleNames: ['William', 'Oliver', 'Noah', 'Emil', 'Victor', 'Magnus', 'Frederik', 'Malthe', 'Elias', 'Alexander', 'Oscar', 'Mikkel', 'Lucas', 'August', 'Mathias', 'Anton', 'Benjamin', 'Sebastian', 'Aksel', 'Nikolaj'],
    femaleNames: ['Emma', 'Ida', 'Clara', 'Laura', 'Mathilde', 'Anna', 'Ella', 'Isabella', 'Freja', 'Alma', 'Agnes', 'Liv', 'Olivia', 'Sofia', 'Sofie', 'Ellen', 'Karla', 'Maja', 'Emily', 'Celina'],
    lastNames: ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen', 'Møller', 'Mortensen']
  },
  'Фінляндія': {
    maleNames: ['Eino', 'Väinö', 'Onni', 'Oliver', 'Elias', 'Leo', 'Veeti', 'Aarne', 'Niilo', 'Emil', 'Leevi', 'Aleksi', 'Daniel', 'Viljami', 'Kaapo', 'Jesse', 'Matias', 'Benjamin', 'Samuel', 'Hugo'],
    femaleNames: ['Aino', 'Eevi', 'Emma', 'Sofia', 'Olivia', 'Aada', 'Ellen', 'Helmi', 'Isla', 'Linnea', 'Lilja', 'Venla', 'Ella', 'Enni', 'Kerttu', 'Pihla', 'Emilia', 'Iida', 'Peppi', 'Agnes'],
    lastNames: ['Korhonen', 'Virtanen', 'Mäkinen', 'Nieminen', 'Mäkelä', 'Hämäläinen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen', 'Lehtinen', 'Saarinen', 'Salminen', 'Heinonen', 'Niemi', 'Hakkarainen', 'Jokinen', 'Kinnunen', 'Salonen']
  },
  'Чехія': {
    maleNames: ['Jakub', 'Jan', 'Tomáš', 'Adam', 'Matěj', 'Vojtěch', 'Ondřej', 'Filip', 'Daniel', 'David', 'Lukáš', 'Martin', 'Petr', 'Michael', 'Michal', 'Pavel', 'Václav', 'Jiří', 'Marek', 'Štěpán'],
    femaleNames: ['Tereza', 'Anna', 'Adéla', 'Natálie', 'Karolína', 'Eliška', 'Kristýna', 'Barbora', 'Veronika', 'Klára', 'Anežka', 'Nikola', 'Lucie', 'Viktorie', 'Sofie', 'Emma', 'Zuzana', 'Gabriela', 'Ema', 'Sára'],
    lastNames: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Pokorný', 'Pešek', 'Urban', 'Machala', 'Kratochvíl', 'Šimek', 'Polák', 'Hruška', 'Janda', 'Hrubý']
  },
  'Словаччина': {
    maleNames: ['Jakub', 'Samuel', 'Adam', 'Matej', 'Tomáš', 'Daniel', 'Lukáš', 'Michael', 'Martin', 'Filip', 'David', 'Patrik', 'Marek', 'Dominik', 'Alexander', 'Peter', 'Viktor', 'Erik', 'Michal', 'Oliver'],
    femaleNames: ['Emma', 'Nina', 'Viktória', 'Natália', 'Sára', 'Anna', 'Sofia', 'Ema', 'Tamara', 'Lea', 'Lucia', 'Zuzana', 'Simona', 'Dominika', 'Gabriela', 'Barbora', 'Kristína', 'Petra', 'Nikola', 'Terézia'],
    lastNames: ['Horváth', 'Kováč', 'Varga', 'Tóth', 'Nagy', 'Baláž', 'Szabó', 'Molnár', 'Lukáč', 'Kiss', 'Novák', 'Takáč', 'Hudák', 'Németh', 'Oláh', 'Gašpar', 'Pospíšil', 'Macko', 'Adamčík', 'Blaho']
  },
  'Австрія': {
    maleNames: ['Leon', 'Maximilian', 'David', 'Tobias', 'Paul', 'Elias', 'Jakob', 'Felix', 'Noah', 'Luca', 'Alexander', 'Jonas', 'Fabian', 'Lukas', 'Samuel', 'Ben', 'Julian', 'Moritz', 'Gabriel', 'Simon'],
    femaleNames: ['Anna', 'Emma', 'Marie', 'Lena', 'Lea', 'Sophie', 'Sarah', 'Laura', 'Johanna', 'Magdalena', 'Katharina', 'Julia', 'Hannah', 'Lisa', 'Amelie', 'Nina', 'Valentina', 'Chiara', 'Emilia', 'Mia'],
    lastNames: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Müller', 'Pichler', 'Steiner', 'Moser', 'Mayer', 'Hofer', 'Leitner', 'Berger', 'Fuchs', 'Eder', 'Fischer', 'Schmid', 'Winkler', 'Weber', 'Schwarz', 'Maier']
  },
  'Швейцарія': {
    maleNames: ['Noah', 'Liam', 'Matteo', 'Ben', 'Luca', 'Gabriel', 'Louis', 'Samuel', 'David', 'Leon', 'Nico', 'Nino', 'Elias', 'Aaron', 'Julian', 'Tim', 'Arthur', 'Emil', 'Finn', 'Leonardo'],
    femaleNames: ['Mia', 'Emma', 'Elena', 'Lina', 'Mila', 'Emily', 'Sofia', 'Lea', 'Anna', 'Lara', 'Alina', 'Nina', 'Lia', 'Zoe', 'Chiara', 'Luna', 'Nora', 'Sara', 'Amelie', 'Giulia'],
    lastNames: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Lüthi', 'Sommer', 'Kaufmann', 'Widmer']
  },
  'Бельгія': {
    maleNames: ['Noah', 'Arthur', 'Louis', 'Jules', 'Adam', 'Lucas', 'Liam', 'Hugo', 'Victor', 'Raphaël', 'Gabriel', 'Oscar', 'Léon', 'Maël', 'Mohamed', 'Nathan', 'Sacha', 'Samuel', 'Matteo', 'Aaron'],
    femaleNames: ['Emma', 'Olivia', 'Louise', 'Alice', 'Mila', 'Ella', 'Elena', 'Camille', 'Juliette', 'Eva', 'Léa', 'Chloé', 'Zoë', 'Anna', 'Luna', 'Lina', 'Sofia', 'Nora', 'Marie', 'Lise'],
    lastNames: ['Peeters', 'Janssen', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'De Meyer', 'Vermeulen', 'Van den Berg', 'Dubois', 'Lambert', 'Durand', 'Martin', 'Leroy', 'Simon', 'Laurent']
  },
  'Португалія': {
    maleNames: ['Francisco', 'João', 'Santiago', 'Afonso', 'Tomás', 'Duarte', 'Miguel', 'Martim', 'Pedro', 'Gonçalo', 'António', 'Rodrigo', 'Gabriel', 'Rafael', 'Salvador', 'Lourenço', 'Vicente', 'Simão', 'Guilherme', 'Henrique'],
    femaleNames: ['Matilde', 'Leonor', 'Beatriz', 'Carolina', 'Mariana', 'Inês', 'Maria', 'Ana', 'Sofia', 'Constança', 'Alice', 'Francisca', 'Clara', 'Lara', 'Marta', 'Joana', 'Mafalda', 'Iris', 'Pilar', 'Teresa'],
    lastNames: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Cardoso', 'Carvalho']
  },
  'Греція': {
    maleNames: ['Γιάννης', 'Γιώργος', 'Κωνσταντίνος', 'Δημήτρης', 'Νικόλαος', 'Παναγιώτης', 'Βασίλειος', 'Αθανάσιος', 'Μιχάλης', 'Ευάγγελος', 'Στέφανος', 'Παύλος', 'Αντώνης', 'Μάριος', 'Αλέξανδρος', 'Χρήστος', 'Θεόδωρος', 'Πέτρος', 'Ανδρέας', 'Ιωάννης'],
    femaleNames: ['Μαρία', 'Ελένη', 'Αικατερίνη', 'Βασιλική', 'Σοφία', 'Αγγελική', 'Γεωργία', 'Δήμητρα', 'Παρασκευή', 'Ιωάννα', 'Αναστασία', 'Ευτυχία', 'Χριστίνα', 'Καλλιόπη', 'Πηνελόπη', 'Αντωνία', 'Αθηνά', 'Φωτεινή', 'Στυλιανή', 'Ελεονώρα'],
    lastNames: ['Παπαδόπουλος', 'Γιαννακόπουλος', 'Παπαγεωργίου', 'Βλάχος', 'Αντωνόπουλος', 'Γεωργίου', 'Κωνσταντίνου', 'Νικολάου', 'Πετρόπουλος', 'Μιχαηλίδης', 'Χριστοδούλου', 'Αγγελόπουλος', 'Κάρολος', 'Μπαλάσκας', 'Θεοδωράκης', 'Καραγιάννης', 'Σταυρόπουλος', 'Μακρής', 'Σπανός', 'Λαζάρου']
  },
  'Хорватія': {
    maleNames: ['Luka', 'David', 'Filip', 'Mateo', 'Petar', 'Ivan', 'Marko', 'Ante', 'Josip', 'Duje', 'Noa', 'Leon', 'Niko', 'Toma', 'Roko', 'Marin', 'Dario', 'Gabriel', 'Stjepan', 'Antonio'],
    femaleNames: ['Mia', 'Sara', 'Petra', 'Ana', 'Lana', 'Ema', 'Lucija', 'Tena', 'Nika', 'Elena', 'Paula', 'Lea', 'Ivana', 'Karla', 'Klara', 'Marta', 'Ena', 'Lara', 'Sofia', 'Iva'],
    lastNames: ['Marić', 'Horvat', 'Babić', 'Novak', 'Jurić', 'Knežević', 'Petrović', 'Perić', 'Vuković', 'Matić', 'Tomić', 'Kovačević', 'Pavlović', 'Blažević', 'Grgić', 'Radić', 'Božić', 'Antić', 'Šimić', 'Rončević']
  },
  'Румунія': {
    maleNames: ['David', 'Andrei', 'Alexandru', 'Matei', 'Luca', 'Stefan', 'Gabriel', 'Radu', 'Darius', 'Mihai', 'Adrian', 'Vlad', 'Cristian', 'Daniel', 'Nicholas', 'Victor', 'Bogdan', 'Ionuț', 'Florin', 'Sebastian'],
    femaleNames: ['Maria', 'Ioana', 'Andreea', 'Elena', 'Ana', 'Gabriela', 'Cristina', 'Alexandra', 'Mihaela', 'Raluca', 'Daniela', 'Alina', 'Diana', 'Simona', 'Roxana', 'Larisa', 'Bianca', 'Carmen', 'Antonia', 'Daria'],
    lastNames: ['Popescu', 'Popa', 'Pop', 'Radu', 'Stoica', 'Stan', 'Dumitrescu', 'Dima', 'Constantinescu', 'Marin', 'Tudose', 'Lazar', 'Mihai', 'Georgescu', 'Nistor', 'Florea', 'Dobre', 'Sandu', 'Matei', 'Ilie']
  },
  'Болгарія': {
    maleNames: ['Александър', 'Георги', 'Димитър', 'Николай', 'Христо', 'Петър', 'Иван', 'Васил', 'Стефан', 'Мартин', 'Андрей', 'Даниел', 'Марио', 'Виктор', 'Кристиян', 'Антон', 'Добромир', 'Радослав', 'Борислав', 'Любомир'],
    femaleNames: ['Мария', 'Ивана', 'Елена', 'Йоана', 'Анна', 'Петя', 'Таня', 'Надежда', 'Красимира', 'Диана', 'Габриела', 'Калина', 'Николета', 'Светлана', 'Десислава', 'Стефка', 'Росица', 'Цветелина', 'Виктория', 'Златка'],
    lastNames: ['Иванов', 'Георгиев', 'Димитров', 'Петров', 'Николов', 'Стоянов', 'Тодоров', 'Христов', 'Колев', 'Илиев', 'Ангелов', 'Василев', 'Атанасов', 'Митев', 'Русев', 'Костов', 'Маринов', 'Кирилов', 'Найденов', 'Антонов']
  },
  'Естонія': {
    maleNames: ['Oliver', 'Robin', 'Hugo', 'Sebastian', 'Oskar', 'Mattias', 'Aleksandr', 'Andreas', 'Daniel', 'Martin', 'Kevin', 'Marko', 'Karl', 'Robert', 'Mihkel', 'Maksim', 'Alex', 'Artur', 'Rainer', 'Tanel'],
    femaleNames: ['Emma', 'Sofia', 'Mia', 'Emily', 'Laura', 'Elisabeth', 'Victoria', 'Aleksandra', 'Anna', 'Nora', 'Adele', 'Maria', 'Emilia', 'Alisa', 'Hanna', 'Liisa', 'Kristiina', 'Mari', 'Kaia', 'Helen'],
    lastNames: ['Tamm', 'Saar', 'Sepp', 'Mägi', 'Kask', 'Rebane', 'Ilves', 'Pärn', 'Koppel', 'Kukk', 'Raud', 'Kuusk', 'Parts', 'Vaher', 'Mets', 'Org', 'Teder', 'Käär', 'Liiv', 'Lepik']
  },
  'Литва': {
    maleNames: ['Mykolas', 'Lukas', 'Dovydas', 'Dominykas', 'Kajus', 'Nojus', 'Maksas', 'Motiejus', 'Tomas', 'Gabrielius', 'Martynas', 'Paulius', 'Rokas', 'Domantas', 'Emilis', 'Justinas', 'Arnas', 'Vytautas', 'Erikas', 'Mindaugas'],
    femaleNames: ['Emilija', 'Sofija', 'Liepa', 'Gabija', 'Urtė', 'Austėja', 'Ieva', 'Kotryna', 'Patricija', 'Rugilė', 'Viktorija', 'Smiltė', 'Goda', 'Neringa', 'Aušra', 'Rūta', 'Gintarė', 'Monika', 'Rasa', 'Eglė'],
    lastNames: ['Kazlauskas', 'Petrauskas', 'Jankauskas', 'Stankevicius', 'Lukauskas', 'Žukauskas', 'Butkus', 'Paulauskas', 'Urbonas', 'Kavalauskas', 'Ramanauskas', 'Navickas', 'Šimkus', 'Gudaitis', 'Stankus', 'Rimkus', 'Sakalauskas', 'Tamošiūnas', 'Bendorius', 'Mikalauskas']
  },
  'Латвія': {
    maleNames: ['Roberts', 'Emīls', 'Gustavs', 'Niks', 'Markuss', 'Aleksis', 'Daniels', 'Ralfs', 'Bruno', 'Viktors', 'Rihards', 'Artūrs', 'Matīss', 'Edvards', 'Andrejs', 'Kristaps', 'Kārlis', 'Mārtiņš', 'Rinalds', 'Jānis'],
    femaleNames: ['Sofija', 'Anna', 'Emīlija', 'Aleksandra', 'Alise', 'Marta', 'Emma', 'Elizabete', 'Paula', 'Eva', 'Marija', 'Katrīna', 'Elīza', 'Laura', 'Adele', 'Daniela', 'Viktorija', 'Linda', 'Kristīne', 'Madara'],
    lastNames: ['Bērziņš', 'Kalnins', 'Ozols', 'Liepa', 'Krūmiņš', 'Zariņš', 'Pētersons', 'Jansons', 'Kronbergs', 'Lapiņš', 'Eglītis', 'Balodis', 'Dumpis', 'Sproģis', 'Kalniņš', 'Bite', 'Vītols', 'Šmits', 'Ziediņš', 'Grauds']
  },
  'Ірландія': {
    maleNames: ['Jack', 'James', 'Noah', 'Conor', 'Daniel', 'Luke', 'Adam', 'Ryan', 'Aaron', 'Charlie', 'Harry', 'Oisín', 'Alex', 'Ben', 'Cian', 'Jamie', 'Fionn', 'Liam', 'Mason', 'Darragh'],
    femaleNames: ['Emily', 'Grace', 'Fiadh', 'Sophie', 'Ava', 'Amelia', 'Emma', 'Ella', 'Aoife', 'Hannah', 'Lucy', 'Lily', 'Chloe', 'Sophia', 'Anna', 'Sarah', 'Kate', 'Zoe', 'Caoimhe', 'Saoirse'],
    lastNames: ['Murphy', 'Kelly', 'O\'Sullivan', 'Walsh', 'Smith', 'O\'Brien', 'Byrne', 'Ryan', 'O\'Connor', 'O\'Neill', 'O\'Reilly', 'Doyle', 'McCarthy', 'Gallagher', 'O\'Doherty', 'Kennedy', 'Lynch', 'Murray', 'Quinn', 'Moore']
  },
  'Ісландія': {
    maleNames: ['Aron', 'Kjartan', 'Viktor', 'Alex', 'Mikael', 'Daníel', 'Davíð', 'Elías', 'Emil', 'Jón', 'Óli', 'Kristján', 'Alexander', 'Bjarki', 'Einar', 'Gunnar', 'Hákon', 'Ívar', 'Jakob', 'Magnús'],
    femaleNames: ['Emma', 'Guðrún', 'Anna', 'Saga', 'Emilía', 'Íris', 'Eva', 'Sara', 'Freyja', 'Lilja', 'Elísabet', 'Katrín', 'Ragnhildur', 'Sigríður', 'María', 'Sólveig', 'Ásta', 'Björk', 'Helga', 'Kristín'],
    lastNames: ['Jónsson', 'Sigurðsson', 'Guðmundsson', 'Einarsson', 'Magnússon', 'Ólafsson', 'Kristjánsson', 'Arnarson', 'Eiríksson', 'Ragnarsson', 'Baldursson', 'Þórsson', 'Gunnarsson', 'Hansson', 'Pétursson', 'Ásgeir', 'Björnsson', 'Gíslason', 'Þorsteinsson', 'Hafþórsson']
  },
  'Сербія': {
    maleNames: ['Stefan', 'Luka', 'Marko', 'Nikola', 'Miloš', 'Aleksandar', 'Petar', 'Nemanja', 'Dimitrije', 'Vuk', 'Filip', 'Andrija', 'Mateja', 'Ognjen', 'Dušan', 'Vladimir', 'Bogdan', 'Jovan', 'Igor', 'Dragan'],
    femaleNames: ['Milica', 'Ana', 'Jelena', 'Marija', 'Sara', 'Tijana', 'Jovana', 'Anja', 'Katarina', 'Tamara', 'Teodora', 'Isidora', 'Mina', 'Anastasija', 'Nina', 'Petra', 'Anđela', 'Dunja', 'Lena', 'Emilija'],
    lastNames: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević', 'Živković', 'Tomić', 'Đurić', 'Kostić', 'Stefanović', 'Mitrović', 'Popović', 'Radovanović', 'Božović', 'Vasić']
  },
  'Чорногорія': {
    maleNames: ['Marko', 'Stefan', 'Luka', 'Nikola', 'Miloš', 'Petar', 'Filip', 'Nemanja', 'Vuk', 'Aleksandar', 'Dimitrije', 'Bogdan', 'Ognjen', 'Vladimir', 'Dušan', 'Jovan', 'Igor', 'Dragan', 'Milan', 'Dejan'],
    femaleNames: ['Ana', 'Milica', 'Jelena', 'Marija', 'Sara', 'Tijana', 'Anja', 'Katarina', 'Jovana', 'Tamara', 'Teodora', 'Nina', 'Petra', 'Anđela', 'Mina', 'Isidora', 'Dunja', 'Lena', 'Emilija', 'Anastasija'],
    lastNames: ['Popović', 'Petrović', 'Nikolić', 'Jovanović', 'Marković', 'Stojanović', 'Đurović', 'Božović', 'Radović', 'Stanković', 'Milošević', 'Tomić', 'Đorđević', 'Ilić', 'Stefanović', 'Kostić', 'Mitrović', 'Pavlović', 'Radovanović', 'Živković']
  },
  'Боснія і Герцеговина': {
    maleNames: ['Armin', 'Emir', 'Haris', 'Tarik', 'Dino', 'Amar', 'Kemal', 'Anel', 'Adis', 'Eldar', 'Mirza', 'Samir', 'Ajdin', 'Almir', 'Amer', 'Amil', 'Denis', 'Eldin', 'Enis', 'Jasmin'],
    femaleNames: ['Amira', 'Lejla', 'Amina', 'Sara', 'Emina', 'Ajla', 'Selma', 'Ena', 'Hana', 'Dina', 'Alma', 'Lamija', 'Melisa', 'Amela', 'Ema', 'Anida', 'Majda', 'Zerina', 'Adna', 'Elma'],
    lastNames: ['Hodžić', 'Beganović', 'Softić', 'Muminović', 'Imamović', 'Husić', 'Salihović', 'Đumić', 'Šabanović', 'Čolić', 'Kadić', 'Čaušević', 'Hadžić', 'Ahmetović', 'Bašić', 'Ramić', 'Mujić', 'Korajlić', 'Delić', 'Rašidović']
  },
  'Північна Македонія': {
    maleNames: ['Stefan', 'Marko', 'Nikola', 'Aleksandar', 'Luka', 'Filip', 'Petar', 'Dimitar', 'Vladimir', 'Bojan', 'Kristijan', 'Jovche', 'Teodor', 'Daniel', 'Martin', 'Goce', 'Oliver', 'Dragan', 'Zoran', 'Boris'],
    femaleNames: ['Ana', 'Marija', 'Elena', 'Stefanija', 'Teodora', 'Jovana', 'Kristina', 'Tamara', 'Natasha', 'Dragana', 'Bisera', 'Vesna', 'Magdalena', 'Jasmina', 'Vaska', 'Biljana', 'Olivera', 'Aneta', 'Elizabeta', 'Silvana'],
    lastNames: ['Petrov', 'Stojanovski', 'Nikolovski', 'Stojanov', 'Todorov', 'Trajkovski', 'Angelovski', 'Dimitrov', 'Georgiev', 'Jovanovski', 'Kostovski', 'Mitrev', 'Ristovski', 'Stefanov', 'Vasilev', 'Zdravkovski', 'Blazhevski', 'Panovski', 'Velkovski', 'Tasevski']
  },
  'Словенія': {
    maleNames: ['Luka', 'Nik', 'Mark', 'Filip', 'Žan', 'Jakob', 'Tim', 'David', 'Tilen', 'Maj', 'Matej', 'Jan', 'Gal', 'Lovro', 'Vid', 'Aleks', 'Miha', 'Gašper', 'Tadej', 'Jaka'],
    femaleNames: ['Lara', 'Ema', 'Sara', 'Eva', 'Zala', 'Ana', 'Mia', 'Lana', 'Nika', 'Ajda', 'Teja', 'Nina', 'Tina', 'Meta', 'Maja', 'Leja', 'Klara', 'Hana', 'Petra', 'Pia'],
    lastNames: ['Novak', 'Horvat', 'Krajnc', 'Zupančič', 'Kralj', 'Kovačič', 'Potočnik', 'Mlakar', 'Kos', 'Vidmar', 'Golob', 'Kavčič', 'Turk', 'Božič', 'Rozman', 'Žagar', 'Hribar', 'Jereb', 'Šuštar', 'Kmetec']
  },
  'Албанія': {
    maleNames: ['Ardit', 'Enkel', 'Kevin', 'Klajdi', 'Luan', 'Marin', 'Noel', 'Real', 'Rayan', 'Teo', 'Alessio', 'Andi', 'Endrit', 'Kristian', 'Mario', 'Matteo', 'Noar', 'Redion', 'Rei', 'Sidrit'],
    femaleNames: ['Amelia', 'Ema', 'Enea', 'Gea', 'Hana', 'Lea', 'Liza', 'Maya', 'Mia', 'Noa', 'Adea', 'Anisa', 'Dea', 'Erin', 'Iris', 'Kejsi', 'Lara', 'Melissa', 'Sara', 'Tea'],
    lastNames: ['Hoxha', 'Shehu', 'Krasniqi', 'Gashi', 'Rama', 'Berisha', 'Meta', 'Hasani', 'Islami', 'Ahmeti', 'Rexhepi', 'Zeneli', 'Kastrati', 'Bajrami', 'Salihu', 'Morina', 'Demolli', 'Beqiri', 'Haliti', 'Shabani']
  },
  'Мальта': {
    maleNames: ['Jake', 'Luca', 'Luke', 'Nathan', 'Ryan', 'Matthew', 'Daniel', 'Gabriel', 'Noah', 'Adam', 'Ben', 'Christian', 'David', 'Ethan', 'James', 'Julian', 'Karl', 'Michael', 'Nicholas', 'Samuel'],
    femaleNames: ['Emma', 'Sophie', 'Maya', 'Chloe', 'Sarah', 'Julia', 'Amy', 'Anna', 'Emily', 'Eva', 'Hannah', 'Isabella', 'Jessica', 'Laura', 'Lea', 'Maria', 'Nicole', 'Rebecca', 'Valentina', 'Victoria'],
    lastNames: ['Borg', 'Camilleri', 'Mifsud', 'Farrugia', 'Vella', 'Zammit', 'Attard', 'Cassar', 'Grech', 'Fenech', 'Agius', 'Galea', 'Saliba', 'Sammut', 'Tabone', 'Cutajar', 'Portelli', 'Schembri', 'Micallef', 'Debono']
  },
  'Кіпр': {
    maleNames: ['Andreas', 'Georgios', 'Panagiotis', 'Christos', 'Dimitrios', 'Nikolaos', 'Michail', 'Konstantinos', 'Ioannis', 'Alexandros', 'Antonis', 'Marios', 'Savvas', 'Costas', 'Stelios', 'Pavlos', 'Vasilis', 'Yiannis', 'Petros', 'Lefteris'],
    femaleNames: ['Maria', 'Eleni', 'Aikaterini', 'Sofia', 'Christina', 'Anna', 'Georgia', 'Dimitra', 'Ioanna', 'Anastasia', 'Paraskevi', 'Kalliopi', 'Vasiliki', 'Despina', 'Andria', 'Kyriaki', 'Styliani', 'Antonia', 'Foteini', 'Evanthia'],
    lastNames: ['Papadopoulos', 'Georgiou', 'Constantinou', 'Ioannou', 'Charalambous', 'Andreou', 'Pavlou', 'Dimitriou', 'Nicolaou', 'Antoniou', 'Christodoulou', 'Evangelou', 'Savva', 'Loizou', 'Pierides', 'Stylianou', 'Michaelides', 'Petrou', 'Xenophontos', 'Hadjianastassiou']
  },
  'Молдова': {
    maleNames: ['Ion', 'Andrei', 'Alexandru', 'Mihai', 'Vasile', 'Nicolae', 'Sergiu', 'Dmitri', 'Vladimir', 'Gheorghe', 'Maxim', 'Vitalie', 'Adrian', 'Pavel', 'Constantin', 'Dorin', 'Eugen', 'Florin', 'Igor', 'Valentin'],
    femaleNames: ['Maria', 'Elena', 'Ana', 'Natalia', 'Tatiana', 'Svetlana', 'Irina', 'Oxana', 'Daniela', 'Ala', 'Cristina', 'Veronica', 'Victoria', 'Rodica', 'Liliana', 'Mariana', 'Valentina', 'Olga', 'Angela', 'Lidia'],
    lastNames: ['Popescu', 'Rusu', 'Radu', 'Popa', 'Stancu', 'Munteanu', 'Dima', 'Ionescu', 'Negrescu', 'Ciobanu', 'Stoica', 'Moraru', 'Gheorghiu', 'Vasile', 'Mihai', 'Cojocaru', 'Tanase', 'Luca', 'Manole', 'Paun']
  }
}

interface NameGeneratorProps {
  className?: string
}

export default function NameGenerator({ className = '' }: NameGeneratorProps) {
  const [selectedCountry, setSelectedCountry] = useState('Украина')
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'random'>('random')
  const [generatedName, setGeneratedName] = useState('')
  const [generateCount, setGenerateCount] = useState(1)
  const [generatedList, setGeneratedList] = useState<string[]>([])
  const [useTransliteration, setUseTransliteration] = useState(false)

  const countries = Object.keys(NAMES_DATABASE)

  const transliterate = (text: string): string => {
    const transliterationMap: Record<string, string> = {
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z',
      'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
      'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z',
      'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
      'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'Ґ': 'G', 'Є': 'Ye', 'І': 'I', 'Ї': 'Yi',
      'ґ': 'g', 'є': 'ye', 'і': 'i', 'ї': 'yi',
      'Ѝ': 'I', 'ѝ': 'i'
    }
    
    let result = text.split('').map(char => transliterationMap[char] || char).join('')
    result = result.replace(/[ьъЬЪ]/g, '')
    return result
  }

  const generateRandomName = () => {
    const countryData = NAMES_DATABASE[selectedCountry as keyof typeof NAMES_DATABASE]
    if (!countryData) return ''

    const gender = selectedGender === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : selectedGender
    const names = gender === 'male' ? countryData.maleNames : countryData.femaleNames
    const lastNames = countryData.lastNames

    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]

    const fullName = `${randomName} ${randomLastName}`
    return useTransliteration ? transliterate(fullName) : fullName
  }

  const handleGenerate = () => {
    if (generateCount === 1) {
      const name = generateRandomName()
      setGeneratedName(name)
      setGeneratedList([])
    } else {
      const names = Array.from({ length: generateCount }, () => generateRandomName())
      setGeneratedList(names)
      setGeneratedName('')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Скопировано: ${text}`, {
        duration: 2000,
        style: { background: '#059669', color: '#fff' }
      })
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success(`Скопировано: ${text}`, {
        duration: 2000,
        style: { background: '#059669', color: '#fff' }
      })
    }
  }

  const copyAllNames = async () => {
    const allNames = generatedList.join('\n')
    try {
      await navigator.clipboard.writeText(allNames)
      toast.success(`Скопировано ${generatedList.length} имен`, {
        duration: 2000,
        style: { background: '#059669', color: '#fff' }
      })
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = allNames
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success(`Скопировано ${generatedList.length} имен`, {
        duration: 2000,
        style: { background: '#059669', color: '#fff' }
      })
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <FaUser className="w-6 h-6 text-blue-400" />
          Генератор имен
        </h2>
        <p className="text-slate-400">Генерация реалистичных имен и фамилий из разных стран мира</p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaGlobe className="w-5 h-5 text-green-400" />
          Настройки генерации
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Страна</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white hover:border-white/20 transition-colors"
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Пол</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGender('male')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                  selectedGender === 'male'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <FaMale className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setSelectedGender('female')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                  selectedGender === 'female'
                    ? 'bg-pink-600 border-pink-500 text-white'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <FaFemale className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setSelectedGender('random')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                  selectedGender === 'random'
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <FaRandom className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Количество</label>
            <input
              type="number"
              min="1"
              max="100"
              value={generateCount}
              onChange={(e) => setGenerateCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white hover:border-white/20 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
              <FaLanguage className="w-3 h-3" />
              Алфавит
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setUseTransliteration(false)}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                  !useTransliteration
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                Кириллица
              </button>
              <button
                onClick={() => setUseTransliteration(true)}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                  useTransliteration
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                Латиница
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Действие</label>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg"
            >
              <FaRandom className="w-4 h-4 inline mr-2" />
              Генерировать
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(generatedName || generatedList.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Результат</h3>
                {generatedList.length > 0 && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    useTransliteration 
                      ? 'bg-orange-600/20 text-orange-300' 
                      : 'bg-indigo-600/20 text-indigo-300'
                  }`}>
                    {useTransliteration ? 'Латиница' : 'Кириллица'}
                  </span>
                )}
              </div>
              {generatedList.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyAllNames}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  <FaCopy className="w-3 h-3 inline mr-1" />
                  Копировать все
                </motion.button>
              )}
            </div>

            {generatedName && (
              <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-white/10">
                <div className="flex-1">
                  <div className="text-xl font-bold text-white">{generatedName}</div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{selectedCountry}</span>
                    <span className="text-slate-600">•</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      useTransliteration 
                        ? 'bg-orange-600/20 text-orange-300' 
                        : 'bg-indigo-600/20 text-indigo-300'
                    }`}>
                      {useTransliteration ? 'Латиница' : 'Кириллица'}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(generatedName)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                >
                  <FaCopy className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {generatedList.length > 0 && (
              <div className="space-y-2">
                {generatedList.map((name, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <div className="w-6 h-6 bg-slate-700 rounded text-xs flex items-center justify-center text-slate-300">
                      {index + 1}
                    </div>
                    <div className="flex-1 font-medium text-white">{name}</div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => copyToClipboard(name)}
                      className="opacity-0 group-hover:opacity-100 bg-slate-600 hover:bg-slate-500 text-white p-1.5 rounded transition-all"
                    >
                      <FaCopy className="w-3 h-3" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{countries.length}</div>
          <div className="text-sm text-slate-400">Стран</div>
          <div className="text-xs text-slate-500 mt-1">🇪🇺 Европа + Мир</div>
        </div>
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {Object.values(NAMES_DATABASE).reduce((sum, country) => sum + country.maleNames.length, 0)}
          </div>
          <div className="text-sm text-slate-400">Мужских имен</div>
        </div>
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-pink-400">
            {Object.values(NAMES_DATABASE).reduce((sum, country) => sum + country.femaleNames.length, 0)}
          </div>
          <div className="text-sm text-slate-400">Женских имен</div>
        </div>
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {Object.values(NAMES_DATABASE).reduce((sum, country) => sum + country.lastNames.length, 0)}
          </div>
          <div className="text-sm text-slate-400">Фамилий</div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          🇪🇺 Европейские страны
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {['Украина', 'Россия', 'Великобритания', 'Германия', 'Франция', 'Италия', 'Испания', 'Нідерланди', 'Бельгія', 'Швейцарія', 'Австрія', 'Ірландія', 'Португалія'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-slate-800/30 border border-white/10 hover:border-white/20 transition-colors">
              <div className="text-xs font-medium text-slate-300">{country}</div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {['Швеція', 'Норвегія', 'Данія', 'Фінляндія', 'Ісландія'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-blue-800/30 border border-blue-400/20 hover:border-blue-400/40 transition-colors">
              <div className="text-xs font-medium text-blue-200">🇸🇪 {country}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {['Естонія', 'Литва', 'Латвія'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-green-800/30 border border-green-400/20 hover:border-green-400/40 transition-colors">
              <div className="text-xs font-medium text-green-200">🏛️ {country}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {['Польша', 'Чехія', 'Словаччина', 'Хорватія', 'Словенія', 'Румунія', 'Болгарія', 'Молдова'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-purple-800/30 border border-purple-400/20 hover:border-purple-400/40 transition-colors">
              <div className="text-xs font-medium text-purple-200">🏰 {country}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
          {['Греція', 'Сербія', 'Чорногорія', 'Боснія і Герцеговина', 'Північна Македонія', 'Албанія'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-orange-800/30 border border-orange-400/20 hover:border-orange-400/40 transition-colors">
              <div className="text-xs font-medium text-orange-200">⛰️ {country}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
          {['Мальта', 'Кіпр'].map(country => (
            <div key={country} className="text-center p-2 rounded-lg bg-cyan-800/30 border border-cyan-400/20 hover:border-cyan-400/40 transition-colors">
              <div className="text-xs font-medium text-cyan-200">🏝️ {country}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
