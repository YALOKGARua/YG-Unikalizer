import React from 'react'

interface CountryFlagProps {
  country: string
  className?: string
}

const CountryFlag: React.FC<CountryFlagProps> = ({ country, className = "w-4 h-4" }) => {
  const flagMap: { [key: string]: string } = {
    'Украина': 'https://flagcdn.com/24x18/ua.png',
    'россия (отсос#л#)': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a9.png',
    'США': 'https://flagcdn.com/24x18/us.png',
    'Великобритания': 'https://flagcdn.com/24x18/gb.png',
    'Германия': 'https://flagcdn.com/24x18/de.png',
    'Франция': 'https://flagcdn.com/24x18/fr.png',
    'Италия': 'https://flagcdn.com/24x18/it.png',
    'Испания': 'https://flagcdn.com/24x18/es.png',
    'Польша': 'https://flagcdn.com/24x18/pl.png',
    'Японія': 'https://flagcdn.com/24x18/jp.png',
    'Китай': 'https://flagcdn.com/24x18/cn.png',
    'Бразилія': 'https://flagcdn.com/24x18/br.png',
    'Нідерланди': 'https://flagcdn.com/24x18/nl.png',
    'Швеція': 'https://flagcdn.com/24x18/se.png',
    'Норвегія': 'https://flagcdn.com/24x18/no.png',
    'Данія': 'https://flagcdn.com/24x18/dk.png',
    'Фінляндія': 'https://flagcdn.com/24x18/fi.png',
    'Чехія': 'https://flagcdn.com/24x18/cz.png',
    'Словаччина': 'https://flagcdn.com/24x18/sk.png',
    'Австрія': 'https://flagcdn.com/24x18/at.png',
    'Швейцарія': 'https://flagcdn.com/24x18/ch.png',
    'Бельгія': 'https://flagcdn.com/24x18/be.png',
    'Португалія': 'https://flagcdn.com/24x18/pt.png',
    'Греція': 'https://flagcdn.com/24x18/gr.png',
    'Хорватія': 'https://flagcdn.com/24x18/hr.png',
    'Румунія': 'https://flagcdn.com/24x18/ro.png',
    'Болгарія': 'https://flagcdn.com/24x18/bg.png',
    'Естонія': 'https://flagcdn.com/24x18/ee.png',
    'Литва': 'https://flagcdn.com/24x18/lt.png',
    'Латвія': 'https://flagcdn.com/24x18/lv.png',
    'Сербія': 'https://flagcdn.com/24x18/rs.png',
    'Чорногорія': 'https://flagcdn.com/24x18/me.png',
    'Словенія': 'https://flagcdn.com/24x18/si.png',
    'Албанія': 'https://flagcdn.com/24x18/al.png',
    'Мальта': 'https://flagcdn.com/24x18/mt.png',
    'Кіпр': 'https://flagcdn.com/24x18/cy.png',
    'Молдова': 'https://flagcdn.com/24x18/md.png',
    'Боснія і Герцеговина': 'https://flagcdn.com/24x18/ba.png',
    'Північна Македонія': 'https://flagcdn.com/24x18/mk.png',
    'Ірландія': 'https://flagcdn.com/24x18/ie.png',
    'Ісландія': 'https://flagcdn.com/24x18/is.png',
    'Індія': 'https://flagcdn.com/24x18/in.png'
  }

  const flagUrl = flagMap[country]
  
  if (!flagUrl) {
    return <span className="text-blue-400">🌍</span>
  }

  return (
    <img 
      src={flagUrl} 
      alt={`Флаг ${country}`}
      className={`${className} rounded-sm object-cover`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        e.currentTarget.nextElementSibling?.classList.remove('hidden')
      }}
    />
  )
}

export default CountryFlag