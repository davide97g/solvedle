import {
  FEATURE,
  PokemonFeaturesNegative,
  PokemonModel,
  PokemonValidationGuess,
} from "../../../../types/pokemon.model";

import { generateCombinations } from "./combinations";
import { BEST_FIRST_GUESS, getPokemonList } from "../../data";
import { GENERATION } from "../../../../types/user.types";

const countRemainingPokemonWithGuess = (
  validationGuess: Partial<PokemonValidationGuess>,
  pokemonList: PokemonModel[]
) => {
  const features = Object.keys(validationGuess) as FEATURE[];

  const pokemonFiltered = pokemonList.filter((p) =>
    features.every((feature) => {
      const guess = validationGuess[feature] as {
        value: string | number;
        valid: boolean | undefined;
        comparison: "greater" | "less" | "equal" | undefined;
      };
      if (!guess) return true;
      if (guess.valid !== undefined) {
        if (guess.valid) return p[feature] === guess.value;
        return p[feature] !== guess.value;
      } else if (guess.comparison !== undefined) {
        if (guess.comparison === "equal") return p[feature] === guess.value;
        if (guess.comparison === "greater") return p[feature] > guess.value;
        if (guess.comparison === "less") return p[feature] < guess.value;
      }
      return true;
    })
  );

  return pokemonFiltered.length;
};

const createGuessList = (
  pokemon: PokemonModel,
  remainingFeatures: FEATURE[]
): Partial<PokemonValidationGuess>[] => {
  const templateGuess: Partial<PokemonValidationGuess> = {};
  // template guess
  remainingFeatures.forEach((feature) => {
    templateGuess[feature] = {
      value: pokemon[feature],
      valid: undefined,
      comparison: undefined,
    } as any;
  });

  const combs = generateCombinations(templateGuess);
  return combs;
};

// for a give pokemon simulate all the possibile scenarios with every features potentially guessed or not
const computeAvgScore = (
  pokemon: PokemonModel,
  remainingFeatures: FEATURE[],
  pokemonList: PokemonModel[]
): number => {
  let totalScore = 0;
  let count = 0;

  const guessList = createGuessList(pokemon, remainingFeatures);

  guessList.forEach((guess) => {
    const score = countRemainingPokemonWithGuess(guess, pokemonList);
    totalScore += score;
    if (score > 0) count++;
  });

  return totalScore / (count || 1);
};

const findOptimalPokemon = (
  pokemonList: PokemonModel[],
  remainingFeatures: FEATURE[]
) => {
  const pokemonScores: { pokemonId: number; avg: number; name: string }[] = [];

  pokemonList.forEach((pokemon) => {
    const avg = computeAvgScore(pokemon, remainingFeatures, pokemonList);
    pokemonScores.push({ pokemonId: pokemon.id, avg, name: pokemon.name });
  });

  if (!pokemonScores.length) return null;

  const minScore = Math.min(...pokemonScores.map((p) => p.avg));
  const pokemonWithMinScore = pokemonScores.filter((p) => p.avg === minScore);

  const randomIndex = Math.floor(Math.random() * pokemonWithMinScore.length);
  const bestPokemonId = pokemonWithMinScore[randomIndex].pokemonId;

  return pokemonList.find((p) => p.id === bestPokemonId);
};

const generateInfo = (
  validationGuessHistory: Partial<PokemonValidationGuess>[]
) => {
  const guessedFeatures: Partial<PokemonModel> = {};
  const guessedNegativeFeatures: Partial<PokemonFeaturesNegative> = {
    type1: [],
    type2: [],
    habitat: [],
    color: [],
    generation: { min: 0, max: Infinity },
    evolutionStage: { min: 0, max: Infinity },
    height: { min: 0, max: Infinity },
    weight: { min: 0, max: Infinity },
  };
  validationGuessHistory.forEach((validationGuess) => {
    // *** Positive Features ***
    if (validationGuess.type1?.valid)
      guessedFeatures.type1 = validationGuess.type1?.value;
    if (validationGuess.type2?.valid)
      guessedFeatures.type2 = validationGuess.type2?.value;
    if (validationGuess.habitat?.valid)
      guessedFeatures.habitat = validationGuess.habitat?.value;
    if (validationGuess.color?.valid)
      guessedFeatures.color = validationGuess.color?.value;
    if (validationGuess.generation?.comparison === "equal")
      guessedFeatures.generation = validationGuess.generation?.value;
    if (validationGuess.evolutionStage?.comparison === "equal")
      guessedFeatures.evolutionStage = validationGuess.evolutionStage?.value;
    if (validationGuess.height?.comparison === "equal")
      guessedFeatures.height = validationGuess.height?.value;
    if (validationGuess.weight?.comparison === "equal")
      guessedFeatures.weight = validationGuess.weight?.value;

    // *** Negative Features ***
    guessedNegativeFeatures.type1 = guessedNegativeFeatures.type1 || [];
    guessedNegativeFeatures.type2 = guessedNegativeFeatures.type2 || [];
    guessedNegativeFeatures.habitat = guessedNegativeFeatures.habitat || [];
    guessedNegativeFeatures.color = guessedNegativeFeatures.color || [];
    guessedNegativeFeatures.generation = guessedNegativeFeatures.generation || {
      min: 0,
      max: Infinity,
    };
    guessedNegativeFeatures.evolutionStage =
      guessedNegativeFeatures.evolutionStage || { min: 0, max: Infinity };
    guessedNegativeFeatures.height = guessedNegativeFeatures.height || {
      min: 0,
      max: Infinity,
    };
    guessedNegativeFeatures.weight = guessedNegativeFeatures.weight || {
      min: 0,
      max: Infinity,
    };

    if (!validationGuess.type1?.valid)
      guessedNegativeFeatures.type1 = [
        ...new Set([
          ...guessedNegativeFeatures.type1,
          validationGuess.type1?.value as string,
        ]),
      ];

    if (!validationGuess.type2?.valid)
      guessedNegativeFeatures.type2 = [
        ...new Set([
          ...guessedNegativeFeatures.type2,
          validationGuess.type2?.value as string,
        ]),
      ];

    if (!validationGuess.habitat?.valid)
      guessedNegativeFeatures.habitat = [
        ...new Set([
          ...guessedNegativeFeatures.habitat,
          validationGuess.habitat?.value as string,
        ]),
      ];

    if (!validationGuess.color?.valid)
      guessedNegativeFeatures.color = [
        ...new Set([
          ...guessedNegativeFeatures.color,
          validationGuess.color?.value as string,
        ]),
      ];

    if (validationGuess.generation?.comparison !== "equal") {
      const value = validationGuess.generation?.value as number;
      if (validationGuess.generation?.comparison === "greater")
        guessedNegativeFeatures.generation.min = Math.max(
          guessedNegativeFeatures.generation.min,
          value
        );
      else
        guessedNegativeFeatures.generation.max = Math.min(
          guessedNegativeFeatures.generation.max,
          value
        );
    }

    if (validationGuess.evolutionStage?.comparison !== "equal") {
      const value = validationGuess.evolutionStage?.value as number;
      if (validationGuess.evolutionStage?.comparison === "greater")
        guessedNegativeFeatures.evolutionStage.min = Math.max(
          guessedNegativeFeatures.evolutionStage.min,
          value
        );
      else
        guessedNegativeFeatures.evolutionStage.max = Math.min(
          guessedNegativeFeatures.evolutionStage.max,
          value
        );
    }

    if (validationGuess.height?.comparison !== "equal") {
      const value = validationGuess.height?.value as number;
      if (validationGuess.height?.comparison === "greater")
        guessedNegativeFeatures.height.min = Math.max(
          guessedNegativeFeatures.height.min,
          value
        );
      else
        guessedNegativeFeatures.height.max = Math.min(
          guessedNegativeFeatures.height.max,
          value
        );
    }

    if (validationGuess.weight?.comparison !== "equal") {
      const value = validationGuess.weight?.value as number;
      if (validationGuess.weight?.comparison === "greater")
        guessedNegativeFeatures.weight.min = Math.max(
          guessedNegativeFeatures.weight.min,
          value
        );
      else
        guessedNegativeFeatures.weight.max = Math.min(
          guessedNegativeFeatures.weight.max,
          value
        );
    }
  });
  return { guessedFeatures, guessedNegativeFeatures };
};

const filterOutPokemonByNegativeFeatures = (
  pokemonList: PokemonModel[],
  guessedNegativeFeatures: Partial<PokemonFeaturesNegative>
): PokemonModel[] => {
  return pokemonList.filter((p) => {
    if (guessedNegativeFeatures.type1?.includes(p.type1)) return false;
    if (guessedNegativeFeatures.type2?.includes(p.type2)) return false;
    if (guessedNegativeFeatures.habitat?.includes(p.habitat)) return false;
    if (guessedNegativeFeatures.color?.includes(p.color)) return false;
    if (
      guessedNegativeFeatures.generation &&
      (p.generation < guessedNegativeFeatures.generation.min ||
        p.generation > guessedNegativeFeatures.generation.max)
    )
      return false;

    if (
      guessedNegativeFeatures.evolutionStage &&
      (p.evolutionStage < guessedNegativeFeatures.evolutionStage.min ||
        p.evolutionStage > guessedNegativeFeatures.evolutionStage.max)
    )
      return false;

    if (
      guessedNegativeFeatures.height &&
      (p.height < guessedNegativeFeatures.height.min ||
        p.height > guessedNegativeFeatures.height.max)
    )
      return false;

    if (
      guessedNegativeFeatures.weight &&
      (p.weight < guessedNegativeFeatures.weight.min ||
        p.weight > guessedNegativeFeatures.weight.max)
    )
      return false;

    return true;
  });
};

export const guessPokemon = (
  validationGuessHistory: PokemonValidationGuess[],
  gen?: GENERATION
) => {
  // ? when it's the first guess => we already kwow the first optimal pokemon to guess based on the generation
  if (!validationGuessHistory.length) return BEST_FIRST_GUESS[gen ?? "1"];

  const guessedPokemonIds = validationGuessHistory.map((v) => v.id);
  // Filter out the pokemons that have been guessed
  const pokemonStillToGuess = getPokemonList(gen).filter(
    (p) => !guessedPokemonIds.includes(p.id)
  );

  const { guessedFeatures, guessedNegativeFeatures } = generateInfo(
    validationGuessHistory
  );

  //  Filter out the pokemons that have the guessed features
  const guessedFeaturesKeys = Object.keys(guessedFeatures) as FEATURE[];
  const pokemonWithCorrectFeatures = pokemonStillToGuess.filter((p) =>
    guessedFeaturesKeys.every((key) => p[key] === guessedFeatures[key])
  );

  // ? filter out the pokemons that have the guessed negative features

  const remainingFeatures = Object.keys(guessedNegativeFeatures).filter(
    (k) => !guessedFeaturesKeys.includes(k as FEATURE)
  ) as FEATURE[];

  const pokemonFiltered = filterOutPokemonByNegativeFeatures(
    pokemonWithCorrectFeatures,
    guessedNegativeFeatures
  );

  const bestPokemonToGuess = findOptimalPokemon(
    pokemonFiltered,
    remainingFeatures
  );

  return bestPokemonToGuess;
};

export const countRemainingPokemonFromHistory = (
  validationGuessHistory: PokemonValidationGuess[],
  gen?: GENERATION
) => {
  const guessedPokemonIds = validationGuessHistory.map((v) => v.id);
  // Filter out the pokemons that have been guessed
  const pokemonStillToGuess = getPokemonList(gen).filter(
    (p) => !guessedPokemonIds.includes(p.id)
  );

  const { guessedFeatures, guessedNegativeFeatures } = generateInfo(
    validationGuessHistory
  );

  //  Filter out the pokemons that have the guessed features
  const guessedFeaturesKeys = Object.keys(guessedFeatures) as FEATURE[];
  const pokemonWithCorrectFeatures = pokemonStillToGuess.filter((p) =>
    guessedFeaturesKeys.every((key) => p[key] === guessedFeatures[key])
  );

  const pokemonFiltered = filterOutPokemonByNegativeFeatures(
    pokemonWithCorrectFeatures,
    guessedNegativeFeatures
  );

  return pokemonFiltered.length;
};
