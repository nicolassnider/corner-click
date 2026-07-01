import type { Category, Competitor } from '@corner-click/types'
import { LOCAL_AGES, WORLD_CHAMPIONSHIP_AGES } from '@corner-click/types'
import { Button, Card, Input } from '@corner-click/ui'
import type React from 'react'
import { useEffect, useState } from 'react'

interface CompetitorFormProps {
  initialData?: Competitor
  categoryId: string
  categories: Category[]
  onSave: (competitor: Omit<Competitor, 'id' | 'tournamentId'>) => void
  onCancel: () => void
}

export const CompetitorForm: React.FC<CompetitorFormProps> = ({
  initialData,
  categoryId,
  categories,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    categoryId: categoryId,
    firstName: '',
    lastName: '',
    club: '',
    country: '',
    birthDate: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    weight: '' as string | number,
    height: '' as string | number,
    belt: '',
    isSeeded: false,
  })

  const [displayDate, setDisplayDate] = useState(() => {
    if (initialData?.birthDate) {
      const [y, m, d] = initialData.birthDate.split('-')
      return `${d}/${m}/${y}`
    }
    return ''
  })

  useEffect(() => {
    if (initialData) {
      // Validate if the assigned category still exists (it might have been deleted/merged)
      const isCategoryValid = categories.some((c) => c.id === initialData.categoryId)
      const initialCategoryId = isCategoryValid ? initialData.categoryId : ''

      setFormData({
        categoryId:
          initialCategoryId || (categories.some((c) => c.id === categoryId) ? categoryId : ''),
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        club: initialData.club || '',
        country: initialData.country || '',
        birthDate: initialData.birthDate || '',
        gender: initialData.gender || 'MALE',
        weight: initialData?.weight?.toString() || '',
        height: initialData?.height?.toString() || '',
        belt: initialData?.belt || '',
        isSeeded: initialData.isSeeded || false,
      })
    } else {
      setFormData((prev) => ({ ...prev, categoryId }))
    }
  }, [initialData, categoryId, categories.some])

  // Derived unique belt groups from categories
  const uniqueBelts = Array.from(new Set(categories.map((c) => c.beltLevel))).filter(Boolean)

  // Auto-detect category based on inputs
  useEffect(() => {
    if (!formData.birthDate || !formData.weight || !formData.belt) {
      return
    }

    const age = new Date().getFullYear() - new Date(formData.birthDate).getFullYear()
    const weightNum = Number(formData.weight)

    const allAges = [...LOCAL_AGES, ...WORLD_CHAMPIONSHIP_AGES]
    // LOCAL_AGES already contains WORLD_CUP_AGES
    const ageGroup = allAges.find((ag) => age >= ag.minAge && age <= ag.maxAge)

    if (ageGroup) {
      const weightClasses =
        formData.gender === 'MALE' ? ageGroup.maleWeights : ageGroup.femaleWeights
      const weightClass = weightClasses.find((wc) => {
        const min = wc.minWeight ?? 0
        const max = wc.maxWeight ?? 999
        return weightNum > min && weightNum <= max
      })

      if (weightClass) {
        const matchedCategory = categories.find(
          (c) =>
            c.gender === formData.gender &&
            c.ageGroup === ageGroup.name &&
            c.weightClass === weightClass.name &&
            c.beltLevel === formData.belt
        )

        if (matchedCategory && matchedCategory.id !== formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: matchedCategory.id }))
        }
      }
    }
  }, [
    formData.birthDate,
    formData.gender,
    formData.weight,
    formData.belt,
    categories,
    formData.categoryId,
  ])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '') // Solo números
    if (val.length > 8) {
      val = val.slice(0, 8) // Máximo 8 dígitos
    }

    // Formatear como DD/MM/YYYY
    let formatted = val
    if (val.length > 4) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`
    } else if (val.length > 2) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`
    }

    setDisplayDate(formatted)

    // Si está completa, validar y actualizar formData
    if (val.length === 8) {
      const d = parseInt(val.slice(0, 2), 10)
      const m = parseInt(val.slice(2, 4), 10)
      const y = parseInt(val.slice(4), 10)

      const isValid =
        m > 0 && m <= 12 && d > 0 && d <= 31 && y > 1900 && y <= new Date().getFullYear()

      if (isValid) {
        setFormData({
          ...formData,
          birthDate: `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
        })
      }
    } else {
      if (formData.birthDate) {
        setFormData({ ...formData, birthDate: '' })
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Remove the string values of height/weight from the base object
    const { weight, height, ...rest } = formData

    // Use null instead of undefined because Firebase does not support undefined values.
    // Setting a field to null effectively deletes it from the database.
    const submitData: any = { ...rest }

    if (weight) {
      submitData.weight = Number(weight)
    } else {
      submitData.weight = null
    }

    if (height) {
      submitData.height = Number(height)
    } else {
      submitData.height = null
    }

    onSave(submitData)
  }

  return (
    <Card padding="lg" className="mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        {initialData ? 'Editar Competidor' : 'Añadir Competidor'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Dropdown */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <label htmlFor="categoryId" className="block text-sm font-semibold text-gray-700 mb-1">
            Categoría Asignada
          </label>
          <select
            id="categoryId"
            required
            className="block w-full rounded-md border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-blue-900"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          >
            <option value="" disabled>
              Selecciona o ingresa datos para auto-asignar...
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            La categoría se asignará automáticamente al ingresar los datos físicos del competidor.
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
          <Input
            label="Apellidos"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Club / Escuela"
            type="text"
            required
            value={formData.club}
            onChange={(e) => setFormData({ ...formData, club: e.target.value })}
          />
          <Input
            label="País"
            type="text"
            required
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>

        {/* Physical / Registration Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-md border border-blue-100">
          <div>
            <Input
              label="Fecha de Nac."
              type="tel"
              required
              placeholder="DD/MM/AAAA"
              value={displayDate}
              onChange={handleDateChange}
            />
            {displayDate.length === 10 && !formData.birthDate && (
              <p className="mt-1 text-xs text-red-500">Fecha inválida.</p>
            )}
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-blue-900">
              Género
            </label>
            <select
              id="gender"
              required
              className="mt-1 block w-full rounded-md border-blue-200 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as 'MALE' | 'FEMALE',
                })
              }
            >
              <option value="MALE">Masculino</option>
              <option value="FEMALE">Femenino</option>
            </select>
          </div>
          <div>
            <Input
              label="Peso (kg)"
              type="number"
              step="0.1"
              required
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>
          <div>
            <Input
              label="Altura (cm) (Opcional)"
              type="number"
              step="1"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="Ej. 175"
            />
          </div>
          <div className="col-span-1 md:col-span-5">
            <label htmlFor="belt" className="block text-sm font-medium text-blue-900">
              Nivel de Cinturón
            </label>
            <select
              id="belt"
              required
              className="mt-1 block w-full rounded-md border-blue-200 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.belt}
              onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
            >
              <option value="" disabled>
                Seleccionar...
              </option>
              {uniqueBelts.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center mt-2">
          <input
            id="isSeeded"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={formData.isSeeded}
            onChange={(e) => setFormData({ ...formData, isSeeded: e.target.checked })}
          />
          <label htmlFor="isSeeded" className="ml-2 block text-sm font-medium text-gray-900">
            Cabeza de Serie (Seed){' '}
            <span className="text-gray-500 font-normal">
              - Para evitar enfrentamientos tempranos con favoritos
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Guardar Cambios' : 'Registrar Competidor'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
