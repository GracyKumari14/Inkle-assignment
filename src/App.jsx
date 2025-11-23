import { useEffect, useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { FaRegEdit } from "react-icons/fa";
import { LuFilter } from "react-icons/lu";
import { IoLocation } from "react-icons/io5";
import { PiPencilSimple } from "react-icons/pi";
import { IoChevronDown } from "react-icons/io5";

import "./App.css";

const TAXES_API = "https://685013d7e7c42cfd17974a33.mockapi.io/taxes";
const COUNTRIES_API =
  "https://685013d7e7c42cfd17974a33.mockapi.io/countries";

const columnHelper = createColumnHelper();


function formatRequestDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; 

  const options = { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
}

function App() {
  const [data, setData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [showModal, setShowModal] = useState(false);

  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCountriesFilter, setSelectedCountriesFilter] = useState([]);

  
  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const [taxRes, countryRes] = await Promise.all([
          fetch(TAXES_API),
          fetch(COUNTRIES_API),
        ]);
        const taxesJson = await taxRes.json();
        const countriesJson = await countryRes.json();
        setData(taxesJson);
        setCountries(countriesJson);
      } catch (err) {
        console.error("Error fetching data", err);
        alert("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  
  const countryFilterOptions = useMemo(() => {
    if (!countries?.length) return [];
    const names = countries.map((c) => c.name);
    return Array.from(new Set(names)); // unique
  }, [countries]);

  
  const filteredData = useMemo(() => {
    if (!selectedCountriesFilter.length) return data;
    return data.filter((row) =>
      selectedCountriesFilter.includes(row.country)
    );
  }, [data, selectedCountriesFilter]);

  
  const handleCountryFilterToggle = () => {
    setIsFilterOpen((prev) => !prev);
  };

  
  const handleCountryFilterChange = (name) => {
    setSelectedCountriesFilter((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
    setIsFilterOpen(false); 
  };

  
  function handleEditClick(row) {
    setEditRow(row);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditRow(null);
  }

  async function handleSave(updated) {
    if (!editRow) return;

    const payload = {
      ...editRow,
      name: updated.name,
      country: updated.country,
    };

    try {
      const res = await fetch(`${TAXES_API}/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();

      
      setData((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      closeModal();
    } catch (err) {
      console.error("Error saving", err);
      alert("Failed to save changes");
    }
  }

  
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Entity",
        cell: (info) => (
          <span className="entity-name">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("gender", {
        header: "Gender",
        cell: (info) => {
          const g = info.getValue();
          return (
            <span className={`gender-pill ${g?.toLowerCase() || ""}`}>
              {g}
            </span>
          );
        },
      }),
      columnHelper.accessor("requestDate", {
        header: "Request date",
        cell: (info) => formatRequestDate(info.getValue()),
      }),
      columnHelper.accessor("country", {
        header: () => (
          <div className="country-header">
            <span>Country</span>
            <button
              type="button"
              className={`filter-icon-button ${
                selectedCountriesFilter.length ? "active" : ""
              }`}
              onClick={handleCountryFilterToggle}
            >
              <LuFilter className="filter-icon" />
            </button>

            {isFilterOpen && (
              <div className="filter-dropdown">
                {countryFilterOptions.map((name) => (
                  <label key={name} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedCountriesFilter.includes(name)}
                      onChange={() => handleCountryFilterChange(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            className="icon-button"
            onClick={() => handleEditClick(info.row.original)}
            aria-label="Edit"
          >
            <FaRegEdit className="edit-icon" />
          </button>
        ),
      }),
    ],
    [
      countryFilterOptions,
      isFilterOpen,
      selectedCountriesFilter,
    ]
  );

  
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="app-root">
      <h1 className="page-title">Customers</h1>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && editRow && (
        <EditCustomerModal
          countries={countries}
          initialName={editRow.name}
          initialCountry={editRow.country}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}


function EditCustomerModal({
  countries,
  initialName,
  initialCountry,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(initialName || "");
  const [country, setCountry] = useState(initialCountry || "");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !country.trim()) {
      alert("Name and country are required");
      return;
    }
    onSave({ name, country });
  }

  const handleSelectCountry = (countryName) => {
    setCountry(countryName);
    setIsCountryOpen(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Edit Customer</h2>
          <button className="icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label className="field-label">
            <span className="label-text">
              Name<span className="required">*</span>
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </label>

          <label className="field-label">
            Country
            <div
              className="custom-select"
              onClick={() => setIsCountryOpen((prev) => !prev)}
            >
              <span className={country ? "" : "placeholder"}>
                {country || "Select country"}
              </span>
              <IoChevronDown className="custom-select-arrow" />
            </div>

            {isCountryOpen && (
              <div className="custom-select-dropdown">
                {countries.map((c) => (
                  <div
                    key={c.id}
                    className="custom-select-option"
                    onClick={() => handleSelectCountry(c.name)}
                  >
                    <div className="country-left">
                      <IoLocation className="country-icon" />
                      <span>{c.name}</span>
                    </div>

                    <button
                      type="button"
                      className="dropdown-edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Edit country clicked:", c.name);
                      }}
                    >
                      <PiPencilSimple className="dropdown-edit-icon" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
